
/* CINEFLIX — etiquetas do catálogo.
   Status no Firestore, coleção conteudos:
   statusExibicao = "lancamento" | "disponivel" | "embreve".
   Títulos antigos: lancamento=true => lançamento;
   demais => disponível.
*/
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getFirestore, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getFirestore(app);
const statusByTitle = new Map();

const normalize = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');

function statusOf(data) {
  const raw = normalize(data.statusExibicao || data.status || '');
  if (['embreve', 'em breve', 'em_breve'].includes(raw)) return 'embreve';
  if (['lancamento', 'novo lancamento', 'novo_lancamento'].includes(raw)) return 'lancamento';
  if (['disponivel', 'ja disponivel', 'já disponível'].includes(raw)) return 'disponivel';
  return data.lancamento === true ? 'lancamento' : 'disponivel';
}

const info = {
  lancamento: {
    label: 'NOVO LANÇAMENTO',
    background: '#c72236',
    foreground: '#fff'
  },
  disponivel: {
    label: 'JÁ DISPONÍVEL',
    background: '#0a8d51',
    foreground: '#fff'
  },
  embreve: {
    label: 'EM BREVE',
    background: '#e6b84c',
    foreground: '#1e1703'
  }
};

const css = document.createElement('style');
css.textContent = `
.cineflix-status-label {
  position:absolute;
  top:9px;
  left:8px;
  z-index:3;
  padding:6px 8px;
  border-radius:6px;
  font:800 10px system-ui,sans-serif;
  letter-spacing:.3px;
  box-shadow:0 2px 9px #0008;
  pointer-events:none;
}
.card .cine-ribbon:has(~ .cineflix-status-label) {
  display:none;
}
`;
document.head.append(css);

function decorateCard(card) {
  const title = card.querySelector('h3')?.textContent;
  const status = statusByTitle.get(normalize(title));
  if (!status) return;

  const imageBox = card.querySelector('.imagebox');
  if (!imageBox) return;

  let label = imageBox.querySelector('.cineflix-status-label');

  if (!label) {
    label = document.createElement('span');
    label.className = 'cineflix-status-label';
    imageBox.append(label);
  }

  const format = info[status];

  if (label.textContent !== format.label)
    label.textContent = format.label;

  if (label.style.background !== format.background)
    label.style.background = format.background;

  if (label.style.color !== format.foreground)
    label.style.color = format.foreground;

  const ribbon = imageBox.querySelector('.cine-ribbon');

  if (ribbon && ribbon.style.display !== 'none')
    ribbon.style.display = 'none';

  const watch = card.querySelector('.card-body .actions button');

  if (watch) {
    const upcoming = status === 'embreve';

    if (watch.disabled !== upcoming)
      watch.disabled = upcoming;

    if (upcoming && watch.textContent !== 'EM BREVE')
      watch.textContent = 'EM BREVE';
  }
}

function decorateDetail() {
  const page = document.getElementById('detailPage');

  if (!page || page.classList.contains('hidden')) return;

  const status = statusByTitle.get(
    normalize(document.getElementById('detailTitle')?.textContent)
  );

  const watch = document.getElementById('detailPlay');

  if (!watch || status !== 'embreve') return;

  if (!watch.disabled)
    watch.disabled = true;

  if (watch.textContent !== 'Em breve')
    watch.textContent = 'Em breve';

  page.querySelectorAll('#episodes button').forEach(button => {
    if (!button.disabled) button.disabled = true;
  });
}

function decorateHero() {
  const status = statusByTitle.get(
    normalize(document.getElementById('heroTitle')?.textContent)
  );

  const watch = document.getElementById('heroWatch');

  if (!watch || !status) return;

  const upcoming = status === 'embreve';

  if (watch.disabled !== upcoming)
    watch.disabled = upcoming;

  if (upcoming && watch.textContent !== 'EM BREVE')
    watch.textContent = 'EM BREVE';
}

let scheduled = false;

function refresh() {
  if (scheduled) return;

  scheduled = true;

  requestAnimationFrame(() => {
    scheduled = false;

    document.querySelectorAll('#cards .card').forEach(decorateCard);

    decorateDetail();
    decorateHero();
  });
}

const observer = new MutationObserver(refresh);

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['class']
});

onSnapshot(collection(db, 'conteudos'), snapshot => {
  statusByTitle.clear();

  snapshot.forEach(doc => {
    const value = doc.data();

    statusByTitle.set(
      normalize(value.titulo),
      statusOf(value)
    );
  });

  refresh();
}, error => console.warn(
  'CINEFLIX: não foi possível carregar as etiquetas',
  error?.code || error
));

refresh();
