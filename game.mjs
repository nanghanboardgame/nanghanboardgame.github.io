export const BOARD_POINTS = {
  hanYard: [80, 80],
  rivalYard: [20, 80],
  special: [63.5, 82.7],
  finishApproach: [43.5, 95.3],
  finishStart: [50, 95],
  finishGoal: [50, 59],
};

// Centers of the six real cells leading from Nàng Han's lower-right yard.
export const DEMO_PATH = [
  [63.5, 95.3],
  [63.5, 89.3],
  BOARD_POINTS.special,
  [63.5, 76.1],
  [63.5, 69.4],
  [63.5, 62.8],
];

const FINISH_PATH = [
  BOARD_POINTS.finishApproach,
  BOARD_POINTS.finishStart,
  [50, 86],
  [50, 77],
  [50, 68],
  BOARD_POINTS.finishGoal,
];

const FORWARD_CARD = {
  id: 'forward',
  title: 'Bản Mường tiếp sức',
  text: 'Tiến lên 2 ô.',
  image: 'assets/cards/card-10.png',
};

export const DEMO_ACTIONS = [
  {
    id: 'release',
    label: 'Ra quân',
    dice: 6,
    start: BOARD_POINTS.hanYard,
    end: DEMO_PATH[0],
    status: 'Xúc xắc ra 6 — Nàng Han đưa một quân từ khu đội vào đúng ô xuất phát.',
  },
  {
    id: 'move',
    label: 'Di chuyển',
    dice: 3,
    start: DEMO_PATH[0],
    end: DEMO_PATH[3],
    path: DEMO_PATH.slice(0, 4),
    status: 'Nàng Han đi 3 ô theo kết quả xúc xắc.',
  },
  {
    id: 'special',
    label: 'Ô đặc biệt',
    dice: 1,
    start: DEMO_PATH[1],
    end: BOARD_POINTS.special,
    card: FORWARD_CARD,
    cardEnd: DEMO_PATH[4],
    cardPath: DEMO_PATH.slice(3, 5),
    status: 'Quân dừng ở ô hoa, rút thẻ “Bản Mường tiếp sức” và tiến thêm 2 ô.',
  },
  {
    id: 'capture',
    label: 'Đá quân',
    dice: 1,
    start: DEMO_PATH[2],
    end: DEMO_PATH[3],
    opponent: { start: DEMO_PATH[3], end: BOARD_POINTS.rivalYard },
    status: 'Nàng Han dừng đúng ô có quân Quân địch — quân Quân địch bị đá về khu đội.',
  },
  {
    id: 'finish',
    label: 'Về đích',
    dice: 5,
    start: BOARD_POINTS.finishApproach,
    end: BOARD_POINTS.finishGoal,
    path: FINISH_PATH,
    status: 'Quân đi đúng 5 bước vào hàng về đích và dừng ở ô hoa cuối hàng.',
  },
  {
    id: 'reset',
    label: 'Chơi lại',
    status: 'Đã đặt lại hành động. Chọn một tình huống để xem lại.',
  },
];

export function getDemoAction(id) {
  const action = DEMO_ACTIONS.find((item) => item.id === id);
  if (!action) throw new Error(`Không có action demo: ${id}`);
  return action;
}

function initDemo() {
  const board = document.querySelector('[data-game-board]');
  if (!board) return;

  const dice = document.querySelector('[data-dice]');
  const status = document.querySelector('[data-game-status]');
  const cardPanel = document.querySelector('[data-drawn-card]');
  const actionButtons = [...document.querySelectorAll('[data-demo-action]')];
  const actionGroup = document.querySelector('.demo-actions');
  const diceGroup = document.querySelector('.demo-dice');
  const actionHome = actionGroup.parentElement;
  const diceHome = diceGroup.parentElement;
  const cardHome = cardPanel.parentElement;
  const turnGuide = document.querySelector('.turn-guide');
  const mobileQuery = window.matchMedia('(max-width: 820px)');
  let timers = [];
  let diceRoller;

  const dicePhysics = dice.querySelector('[data-dice-physics]');
  if (dicePhysics) {
    import('./dice-physics.mjs')
      .then(({ createDicePhysics }) => {
        diceRoller = createDicePhysics(dicePhysics);
        dice.classList.add('has-physics');
      })
      .catch(() => {});
  }

  const cue = document.createElement('output');
  cue.className = 'board-action-cue';
  cue.setAttribute('aria-live', 'polite');
  board.append(cue);

  const mobileTrigger = document.createElement('button');
  mobileTrigger.type = 'button';
  mobileTrigger.className = 'mobile-board-trigger';
  mobileTrigger.dataset.mobileBoardTrigger = '';
  mobileTrigger.setAttribute('aria-expanded', 'false');
  mobileTrigger.textContent = 'Chạm để thao tác';

  const toggleMobileActions = () => {
    if (!mobileQuery.matches) return;
    const isOpen = !board.classList.contains('show-mobile-actions');
    board.classList.toggle('show-mobile-actions', isOpen);
    mobileTrigger.setAttribute('aria-expanded', String(isOpen));
  };

  const hideMobileActions = () => {
    board.classList.remove('show-mobile-actions');
    mobileTrigger.setAttribute('aria-expanded', 'false');
  };

  const syncMobileControls = () => {
    if (mobileQuery.matches) {
      board.append(diceGroup, actionGroup, mobileTrigger, cardPanel);
      return;
    }
    actionHome.insertBefore(actionGroup, status);
    diceHome.insertBefore(diceGroup, actionGroup);
    cardHome.insertBefore(cardPanel, turnGuide);
    hideMobileActions();
  };

  board.addEventListener('click', (event) => {
    if (event.target.closest('[data-demo-action]')) return;
    toggleMobileActions();
  });
  mobileTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleMobileActions();
  });
  mobileQuery.addEventListener('change', syncMobileControls);
  syncMobileControls();

  const makePiece = (color, label) => {
    const piece = document.createElement('div');
    const image = document.createElement('img');
    piece.className = `horse-piece demo-piece ${color}`;
    piece.dataset.piece = color;
    piece.setAttribute('role', 'img');
    piece.setAttribute('aria-label', label);
    image.src = `assets/pieces/${color}.png`;
    image.alt = '';
    piece.append(image);
    board.append(piece);
    return piece;
  };

  const hanPiece = makePiece('magenta', 'Quân của đội Nàng Han');
  const rivalPiece = makePiece('green', 'Quân của đội Quân địch');

  const place = (piece, point, instant = false) => {
    piece.classList.toggle('no-transition', instant);
    piece.style.left = `${point[0]}%`;
    piece.style.top = `${point[1]}%`;
  };

  const showAt = (piece, point) => {
    piece.hidden = false;
    place(piece, point, true);
    void piece.offsetWidth;
    piece.classList.remove('no-transition');
  };

  const later = (callback, delay) => {
    timers.push(window.setTimeout(callback, delay));
  };

  const moveAlong = (piece, points, startDelay = 0, stepDelay = 360) => {
    points.forEach((point, index) => later(() => {
      place(piece, point);
      piece.classList.remove('is-hopping');
      void piece.offsetWidth;
      piece.classList.add('is-hopping');
    }, startDelay + stepDelay * index));
  };

  const showCue = (text, tone = '') => {
    cue.textContent = text;
    cue.dataset.tone = tone;
    cue.classList.remove('is-visible');
    void cue.offsetWidth;
    cue.classList.add('is-visible');
  };

  const clearStage = () => {
    timers.forEach(window.clearTimeout);
    timers = [];
    [hanPiece, rivalPiece].forEach((piece) => {
      piece.hidden = true;
      piece.classList.remove('is-kicking', 'is-captured', 'is-hopping', 'is-targeted', 'no-transition');
    });
    setDice('–');
    dice.classList.remove('is-rolling');
    cardPanel.hidden = true;
    cardPanel.classList.remove('is-drawn');
    cue.textContent = '';
    cue.classList.remove('is-visible');
    delete cue.dataset.tone;
    actionButtons.forEach((button) => button.classList.remove('active'));
  };

  const rollDice = (value) => {
    setDice(value);
    diceRoller?.roll(value);
    dice.style.setProperty('--dice-spin-x', `${180 + Math.round(Math.random() * 240)}deg`);
    dice.style.setProperty('--dice-spin-y', `${220 + Math.round(Math.random() * 300)}deg`);
    dice.style.setProperty('--dice-spin-z', `${Math.round((Math.random() - 0.5) * 180)}deg`);
    dice.classList.remove('is-rolling');
    void dice.offsetWidth;
    dice.classList.add('is-rolling');
  };

  const setDice = (value) => {
    dice.querySelector('.dice-value').textContent = value;
    dice.querySelector('.dice-cube').dataset.value = value;
    dice.querySelector('.face-front').dataset.number = value;
  };

  const revealCard = (card) => {
    cardPanel.querySelector('img').src = card.image;
    cardPanel.querySelector('strong').textContent = card.title;
    cardPanel.querySelector('p').textContent = card.text;
    cardPanel.hidden = false;
    cardPanel.classList.add('is-drawn');
  };

  const runAction = (id) => {
    const action = getDemoAction(id);
    clearStage();
    board.dataset.activeAction = id;
    status.textContent = action.status;
    document.querySelector(`[data-demo-action="${id}"]`)?.classList.add('active');

    if (id === 'reset') return;

    showAt(hanPiece, action.start);
    rollDice(action.dice);

    if (id === 'release') later(() => {
      showCue('XÚC XẮC 6 · RA QUÂN');
      place(hanPiece, action.end);
    }, 420);
    if (id === 'move') {
      showCue('DI CHUYỂN 3 Ô');
      moveAlong(hanPiece, action.path.slice(1), 220);
    }

    if (id === 'special') {
      later(() => {
        showCue('DỪNG Ở Ô HOA · RÚT THẺ', 'card');
        place(hanPiece, action.end);
        hanPiece.classList.add('is-targeted');
      }, 220);
      later(() => revealCard(action.card), 900);
      later(() => {
        hanPiece.classList.remove('is-targeted');
        showCue('THẺ: TIẾN THÊM 2 Ô', 'card');
        moveAlong(hanPiece, action.cardPath, 0, 380);
      }, 1450);
      later(() => {
        if (!mobileQuery.matches) return;
        cardPanel.classList.remove('is-drawn');
        cardPanel.hidden = true;
      }, 2450);
    }

    if (id === 'capture') {
      showAt(rivalPiece, action.opponent.start);
      rivalPiece.classList.add('is-targeted');
      showCue('QUÂN ĐỊCH ĐANG CHẮN ĐƯỜNG', 'capture');
      later(() => {
        showCue('ĐÁ QUÂN!', 'capture');
        hanPiece.classList.add('is-kicking');
        place(hanPiece, action.end);
      }, 520);
      later(() => {
        rivalPiece.classList.remove('is-targeted');
        rivalPiece.classList.add('is-captured');
        place(rivalPiece, action.opponent.end);
      }, 1080);
    }

    if (id === 'finish') {
      showCue('TIẾN VÀO ĐÍCH');
      action.path.slice(1).forEach((point, index) => later(() => place(hanPiece, point), 180 * (index + 1)));
    }
  };

  actionButtons.forEach((button) => button.addEventListener('click', () => {
    runAction(button.dataset.demoAction);
    if (mobileQuery.matches) hideMobileActions();
  }));
  clearStage();
}

if (typeof document !== 'undefined') initDemo();
