from app.common.error_codes import (
    GENERAL_BAD_REQUEST,
    GENERAL_CONFLICT,
    GENERAL_EXTERNAL_SERVICE_ERROR,
    GENERAL_FORBIDDEN,
    GENERAL_NOT_FOUND,
    GENERAL_UNAUTHORIZED,
)


class KnowSenseException(Exception):
    def __init__(self, code: int, message: str):
        self.code = code
        self.message = message


class NotFoundException(KnowSenseException):
    def __init__(self, message: str = "资源不存在"):
        super().__init__(code=GENERAL_NOT_FOUND, message=message)


class UnauthorizedException(KnowSenseException):
    def __init__(self, message: str = "未认证"):
        super().__init__(code=GENERAL_UNAUTHORIZED, message=message)


class ForbiddenException(KnowSenseException):
    def __init__(self, message: str = "无权限"):
        super().__init__(code=GENERAL_FORBIDDEN, message=message)


class BadRequestException(KnowSenseException):
    def __init__(self, message: str = "请求参数错误"):
        super().__init__(code=GENERAL_BAD_REQUEST, message=message)


class ConflictException(KnowSenseException):
    def __init__(self, message: str = "资源冲突"):
        super().__init__(code=GENERAL_CONFLICT, message=message)


class ExternalServiceException(KnowSenseException):
    def __init__(self, message: str = "外部服务异常"):
        super().__init__(code=GENERAL_EXTERNAL_SERVICE_ERROR, message=message)
