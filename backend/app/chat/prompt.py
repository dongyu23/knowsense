def build_prompt(context: str, question: str, history: list[dict] | None = None) -> str:
    parts = ['你是一个产品说明书智能答疑助手。请严格基于以下说明书内容回答用户问题。\n'
             '如果内容不足以回答，请明确说"说明书未提供相关信息"，不要编造。']

    if history:
        parts.append('\n【对话历史】')
        for msg in history[-10:]:
            role = "用户" if msg["role"] == "user" else "助手"
            parts.append(f'{role}: {msg["content"]}')

    parts.append(f'\n【参考内容】\n{context}')
    parts.append(f'\n【用户问题】{question}')
    parts.append('\n【回答要求】\n- 基于参考内容回答，不编造\n- 回答后列出信息来源\n- 如果涉及操作安全，附上安全提醒')

    return '\n'.join(parts)
