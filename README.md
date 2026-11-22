# Forja de Modpack

Planejador de modpacks de Minecraft (Fabric). Você diz o que quer jogar, a Forja pontua o pack, aponta conflitos e sugere o que falta. Roda direto no navegador, sem build.

Abra `index.html` (ou publique a pasta no GitHub Pages). O estado fica no `localStorage`.

## Estrutura

| Caminho | O que é |
|---|---|
| `index.html` | App: estilos, motor de pontuação, sugestões e telas |
| `fx.js` | Animações (GSAP, ScrollTrigger, Lenis). Opcional: sem as bibliotecas ou com “reduzir movimento” o app funciona igual |
| `data/mods.js` | Catálogo gerado (401 entradas). **Não edite à mão** |
| `vendor/` | GSAP 3.12.5 (+ ScrollTrigger, ScrollToPlugin, Flip) e Lenis 1.1.13, versões fixas e locais |
| `tools/verify.mjs` | Gera `data/mods.js` conferindo cada mod na API do Modrinth |
| `tools/src/` | Fonte do catálogo: descrições, afinidades, RAM/CPU estimadas |

Mantenha `data/` e `vendor/` ao lado do `index.html`.

## O que o catálogo traz

Para cada mod: categoria e subcategoria, resumo do que faz, afinidade com as 9 áreas do objetivo, RAM/CPU/GPU estimadas, nível de invasão, grupos de redundância, conflitos, **builds Fabric por versão do Minecraft, dependências por versão, data da última build e slug no Modrinth** (esses últimos vêm da API, não de estimativa).

Versões acompanhadas: 1.20.1, 1.21.1, 1.21.11, 26.1.x, 26.2 e 26.3. Builds só em alpha não contam como disponíveis.

## Atualizar os dados

Requer Node 18 ou mais novo e acesso a `api.modrinth.com`.

```bash
node tools/verify.mjs          # usa o cache de tools/.cache.json
node tools/verify.mjs --fresh  # consulta tudo de novo
```

O script imprime o que não casou, o que só tem alpha, mods parados e quais builds mudaram em relação à estimativa anterior. Em ambientes com proxy, rode com `NODE_USE_ENV_PROXY=1`.

Para **adicionar um mod**, inclua uma linha em `tools/src/new2.mjs` (use `{slug:'...'}` para fixar o projeto exato) e rode o script. Dependências obrigatórias que ainda não estão no catálogo entram como bibliotecas automaticamente.

Para mudar uma versão do Minecraft, edite `TIERS` em `tools/verify.mjs` e `VERS`/`GVMAP` em `index.html`.

## Como a nota é calculada

Sete critérios, com pesos que mudam conforme a “prioridade de desempenho”:

- **Alinhamento**: cobertura de cada área pedida, direção do que o pack entrega e fidelidade ao vanilla.
- **Foco**: quanto do conteúdo cai nas áreas prioritárias, mods fora do objetivo e dispersão.
- **Desempenho**: RAM contra o heap (curva não linear), CPU somada e GPU (shaders, LODs, física).
- **Estabilidade**: conflitos, dependências faltando (por versão), mods sem build, redundâncias, experimentais e mods sem atualização há mais de 18 meses.
- **Escopo**: tamanho do pack contra a meta e excesso de overhauls.
- **Fundamentos**: mods-base de otimização e essenciais que dependem do objetivo e do tamanho (receitas, informação ao mirar, minimapa).
- **Sinergia e coesão**: combinações que se reforçam somam; famílias que disputam o mesmo espaço tiram pontos.

Conflitos limitam a nota a 70, dependências faltando a 78 e RAM acima de 90% do heap a 65. As combinações e famílias estão em `COMBOS` e `FAMS` no `index.html`.

## Limites conhecidos

- RAM, CPU e GPU por mod são estimativas de ordem de grandeza. Meça o pack final com o spark.
- Algumas builds só existem no CurseForge e não aparecem aqui; o Modrinth é a única fonte.
- Uma dependência listada como obrigatória pode vir embutida no próprio jar; nesse caso o app a trata como necessária por precaução.

## Licenças de terceiros

GSAP (licença padrão da GreenSock, gratuita), Lenis (MIT). Os mods listados pertencem aos seus autores; o app só aponta para as páginas deles.
