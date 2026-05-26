def build_prompt(context: str, question: str, history: list[dict] | None = None) -> str:
    parts = ['你是一个产品说明书智能答疑助手。请基于以下参考内容直接回答用户问题，不要添加开场白或免责声明。']

    if history:
        parts.append('\n【对话历史】')
        for msg in history[-10:]:
            role = "用户" if msg["role"] == "user" else "助手"
            parts.append(f'{role}: {msg["content"]}')

    parts.append(f'\n【参考内容】\n{context}')
    parts.append(f'\n【用户问题】{question}')
    parts.append('\n【回答要求】\n'
                 '- 直接基于参考内容回答，用自然语言组织信息\n'
                 '- 如果参考内容完全无法回答用户问题，只需回复"抱歉，说明书中未找到相关信息"')

    return '\n'.join(parts)
