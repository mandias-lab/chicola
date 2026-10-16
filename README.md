# Chicola — OpenSpec ShellGrid

**Chicola** é uma extensão no estilo **ShellGrid** para **VS Code** e **Google Antigravity**, desenvolvida pela [mandias-lab](https://github.com/mandias-lab).

Ela proporciona acompanhamento visual em tempo real, matriz de tarefas e orquestração do ciclo de vida de especificações gerenciadas pelo **OpenSpec** e **DevFlow**.

---

## ⚡ Funcionalidades

- **Matriz de Tarefas ShellGrid**: Visualize tarefas com barra de progresso, status em tempo real (`pending`, `in_progress`, `completed`) e atalho com 1 clique para navegar até a linha exata no código.
- **Sincronização em Tempo Real**: Observa a pasta `openspec/` e `.devflow/state.json` atualizando o dashboard automaticamente assim que o agente de IA avança uma tarefa.
- **Delta Specs & Cenários**: Inspecione capabilities e requisitos `WHEN / THEN` sem sair do editor.
- **Ações Rápidas**: Dispare tarefas e avanços de worker diretamente pelo painel.

---

## 🛠️ Desenvolvimento Local

```bash
# 1. Instalar dependências
npm install

# 2. Compilar em modo dev com watch
npm run dev

# 3. Compilar bundle de produção
npm run build
```

---

## 📦 Licença

MIT © [mandias-lab](https://github.com/mandias-lab)
