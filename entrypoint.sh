#!/bin/bash
set -e

export DATA_DIR=${DATA_DIR:-/data}
mkdir -p "$DATA_DIR/pg" "$DATA_DIR/redis" "$DATA_DIR/minio"
chown -R postgres:postgres "$DATA_DIR/pg"

# ---- PostgreSQL ----
if [ ! -f "$DATA_DIR/pg/PG_VERSION" ]; then
    echo ">>> Init PostgreSQL..."
    su - postgres -c "/usr/lib/postgresql/17/bin/initdb -D $DATA_DIR/pg -E UTF8 --locale=C.UTF-8"
    echo "host all all 0.0.0.0/0 md5" >> "$DATA_DIR/pg/pg_hba.conf"
    echo "listen_addresses='*'" >> "$DATA_DIR/pg/postgresql.conf"
fi

echo ">>> Starting PostgreSQL..."
su - postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $DATA_DIR/pg -l $DATA_DIR/pg/logfile start"

# Wait for PG
until su - postgres -c "/usr/lib/postgresql/17/bin/pg_isready -q" 2>/dev/null; do sleep 0.5; done

# Create role/db if not exists
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='knowsense'\"" | grep -q 1 || \
    su - postgres -c "psql -c \"CREATE USER knowsense WITH PASSWORD 'knowsense_dev' SUPERUSER\""
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='knowsense'\"" | grep -q 1 || \
    su - postgres -c "createdb -O knowsense knowsense"

# ---- Redis ----
echo ">>> Starting Redis..."
redis-server --daemonize yes --bind 127.0.0.1 --port 6379

# ---- MinIO ----
echo ">>> Starting MinIO..."
MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin_dev \
    minio server "$DATA_DIR/minio" --console-address ":9001" --quiet &
# Wait for MinIO
until curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; do sleep 0.5; done

# ---- Supervisor: Nginx + FastAPI + Worker ----
echo ">>> Starting app services..."
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
