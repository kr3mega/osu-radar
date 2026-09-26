# osu!Radar 🎯

> **A client-side beatmap skill analyzer and tournament pool auditing tool built with WebAssembly, TypeScript, and React.**

<a href="LICENSE"><img src="https://img.shields.io/badge/license-Proprietary-red.svg?style=for-the-badge" alt="License: Proprietary" /></a>
[![Node.js](https://img.shields.io/badge/Node.js-v24.x-221c29?logo=node.js)](https://nodejs.org/)
[![React 19](https://img.shields.io/badge/React-19.x-00d8ff?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-WASM-654ff0?logo=webassembly)](https://webassembly.org/)

---

## 💡 Sobre o Projeto

O **osu!Radar** é uma ferramenta analítica e cinemática *client-side* voltada para o cenário competitivo de *osu!*. Diferente de ferramentas que tentam substituir planilhas de gestão de torneio (Google Sheets), o **osu!Radar** resolve o gargalo que nenhuma planilha consegue sanar: **a dissecação física dos beatmaps em microssegundos**.

A aplicação calcula os atributos de RPG competitivos dos mapas diretamente no navegador do usuário, com **custo zero de servidor**, sem gargalos de *rate limit* da API oficial e sem expor credenciais privadas.

---

## ⚡ Diferenciais de Engenharia

### 1. Ingestão Ultraleve com Descarte de Mídia
- Arraste pacotes `.osz`, arquivos `.zip` ou mapas `.osu` avulsos.
- Através da biblioteca `fflate` em *streaming*, o aplicativo extrai **apenas** os arquivos `.osu` diretamente na memória RAM, ignorando completamente faixas de áudio (`.mp3`, `.wav`), vídeos e imagens de fundo. Um pacote de pool de 300 MB vira menos de 3 MB de dados úteis na RAM.

### 2. Motor Cinemático Vetorial em 4 Canais
Cada nota $P_n = (x_n, y_n, t_n)$ do beatmap é decomposta em 4 canais invariantes de sinal contínuo:
- **Canal 1: Temporal ($\Delta t$)**: Cadência rítmica e **Entropia de Shannon** dos intervalos entre notas para medir **Finger Control (Alt)**, além de sequências $\le 83.3\text{ ms}$ ($\ge 180\text{ BPM}$) para **Speed** e **Stamina**.
- **Canal 2: Espacial ($\Delta d$)**: Distância euclidiana e velocidade instantânea do cursor em px/ms.
- **Canal 3: Angular ($\theta$)**: Ângulo de deflexão entre 3 objetos sucessivos ($P_{n-1} \to P_n \to P_{n+1}$). Deflexões agudas ($\theta \ge 100^\circ$) isolam **Snap Aim** (jumps com desaceleração brusca); deflexões contínuas em arco ($\theta \le 65^\circ$) quantificam **Flow Aim**.
- **Canal 4: Sliders & Tech ($\Delta SV$)**: Variações bruscas de Slider Velocity, curvatura de caminhos e densidade visual dentro da janela de Approach Rate ($TimePreempt$) para isolar **Tech & Reading**.

### 3. Integração de Picos com Decaimento Exponencial (Top-Strain)
Em vez de médias aritméticas ingênuas (que diluiriam uma *deathstream* de 10 segundos em um mapa de 4 minutos), o algoritmo utiliza integração ponderada dos picos de esforço:
$$\text{Skill} = \sum_{k=1}^N \text{strain}_k \cdot (0.95)^{k-1}$$

### 4. Linha do Tempo Contínua ("Eletrocardiograma")
Janelas temporais deslizantes de 2 segundos com 50% de sobreposição mapeiam a evolução da tensão mecânica em cada segundo da música, permitindo identificar com precisão cirúrgica onde ocorrem os *choke points* e *difficulty spikes*.

### 5. Fidelidade Visual 1:1 ao osu-web (`ppy/osu-web`)
- Tokens canônicos de cor: base `#18131d`, painéis `#221c29`, acentos neon em `#ff66aa` e `#00d8ff`.
- Cores canônicas de slots de torneio: NM (`#5975a4`), HD (`#e5a100`), HR (`#ff385c`), DT (`#9b59b6`), FM (`#2ecc71`), TB (`#f39c12`).
- Cartões de beatmap com capa escurecida via gradiente lateral, pílula de Star Rating e tipografia Torus.
- Gráfico de radar hexagonal estilizado com grade escura e nós ciano.

### 6. Persistência Offline e Compartilhamento Zero-Server
- Armazenamento em cache no **IndexedDB** (`dexie`): nenhum mapa é recalculado duas vezes.
- Exportação e importação instantânea de mappools em formato `.json` para compartilhamento entre capitães e árbitros.

---

## 📁 Estrutura do Repositório

```
osu-radar/
├── src/
│   ├── components/
│   │   ├── beatmap/           # BeatmapCard, BeatmapList, ModSlotBadge, BeatmapDetailModal
│   │   ├── charts/            # StatHexagon (Radar), StrainTimeline (Eletrocardiograma)
│   │   ├── layout/            # Navbar estilo osu-web com 1-click demos
│   │   └── pool/              # PoolOverview (anomalias e médias), PoolUploader, PoolExportBar
│   ├── db/                    # IndexedDB cache com Dexie.js
│   ├── engine/                # Motor cinemático: parser, canais temporais, espaciais, angulares, tech e strains
│   ├── store/                 # Zustand store global com ordenação e filtros
│   ├── utils/                 # Extrator fflate em streaming de arquivos .osu
│   ├── workers/               # Web Worker para processamento assíncrono off-main-thread
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── fixtures/              # Beatmaps representativos reais (Jump, Speed/Stamina, Tech)
│   └── kinematics.test.ts     # Suíte de testes automatizados com Vitest
├── tailwind.config.ts         # Tokens canônicos do ppy/osu-web
├── vite.config.ts
└── package.json
```

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ (recomendado Node.js 22 ou 24)
- npm

### 1. Clonar e Instalar
```bash
git clone https://github.com/seu-usuario/osu-radar.git
cd osu-radar
npm install
```

### 2. Rodar Testes de Calibração
```bash
npm test
```

### 3. Executar em Ambiente de Desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

### 4. Build de Produção
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/`.

---

## 🌐 Deploy Gratuito no Firebase Hosting

Como o projeto é 100% *client-side*, o custo de infraestrutura é **zero**.

```bash
# Instale a Firebase CLI caso não tenha
npm install -g firebase-tools

# Inicialize o Firebase Hosting na pasta raiz
firebase init hosting
# -> Selecione "dist" como diretório público
# -> Configure como Single-Page App (SPA): Yes

# Realize o deploy
firebase deploy --only hosting
```

---

## ⚖️ Licença e Direitos Autorais

Este projeto é protegido sob termos de **Licença Proprietária Estrita** (Todos os direitos reservados). Consulte o arquivo [LICENSE](LICENSE) para ler o texto integral do acordo legal.

### Resumo dos Termos:
- **Permissão para Recrutadores e Avaliadores Técnicos**: É expressamente permitida a leitura, auditoria de código e inspeção do repositório para fins de avaliação de habilidades profissionais em processos seletivos.
- **Uso Pessoal e Acadêmico**: É permitida a clonagem e execução local privada exclusivamente para estudo e pesquisa sem redistribuição.
- **Proibição Comercial Total**: É terminantemente proibida qualquer exploração comercial (direta ou indireta), monetização, revenda, sublicenciamento ou disponibilização deste software como serviço (SaaS/plataforma em nuvem) sem consentimento prévio e por escrito do autor.
- **Isenção Total de Garantia e Responsabilidade ("AS IS")**: O software é fornecido no estado em que se encontra, sem garantias de qualquer natureza. O autor fica isento de qualquer responsabilidade jurídica por danos diretos, indiretos ou consequenciais decorrentes do uso ou compilação do código.
