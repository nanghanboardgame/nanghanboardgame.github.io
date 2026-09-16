export const BOARD_POINTS = {
  redYard: [80, 20],
  greenYard: [20, 20],
  special: [82.7, 36.5],
  finishStart: [95, 50],
  goal: [50, 50],
};

// Centers of the six real cells on the upper-right arm of the supplied board artwork.
export const DEMO_PATH = [
  [95.3, 36.5],
  [89.3, 36.5],
  BOARD_POINTS.special,
  [76.1, 36.5],
  [69.4, 36.5],
  [62.8, 36.5],
];

const FINISH_PATH = [
  BOARD_POINTS.finishStart,
  [86, 50],
  [77, 50],
  [68, 50],
  [59, 50],
  BOARD_POINTS.goal,
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
    start: BOARD_POINTS.redYard,
    end: DEMO_PATH[0],
    status: 'Xúc xắc ra 6 — Đội Đỏ đưa một quân từ khu đội vào đúng ô xuất phát.',
  },
  {
    id: 'move',
    label: 'Di chuyển',
    dice: 3,
    start: DEMO_PATH[0],
    end: DEMO_PATH[3],
    path: DEMO_PATH.slice(0, 4),
    status: 'Quân Đỏ đi 3 ô theo kết quả xúc xắc.',
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
    opponent: { start: DEMO_PATH[3], end: BOARD_POINTS.greenYard },
    status: 'Quân Đỏ dừng đúng ô có quân Lục — quân Lục bị đá về khu đội.',
  },
  {
    id: 'finish',
    label: 'Về đích',
    dice: 6,
    start: BOARD_POINTS.finishStart,
    end: BOARD_POINTS.goal,
    path: FINISH_PATH,
    status: 'Quân đi đủ số bước trên đường về đích và chạm tâm bàn cờ.',
  },
  {
    id: 'reset',
    label: 'Chơi lại',
    status: 'Đã đặt lại demo. Chọn một tình huống để xem animation.',
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
  const playerCards = [...document.querySelectorAll('[data-player-card]')];
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

  const redPiece = makePiece('red', 'Quân Đỏ');
  const greenPiece = makePiece('green', 'Quân Lục');

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
    [redPiece, greenPiece].forEach((piece) => {
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
    playerCards.forEach((card) => card.classList.remove('active'));
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
    board.dataset.demoAction = id;
    status.textContent = action.status;
    document.querySelector(`[data-demo-action="${id}"]`)?.classList.add('active');

    if (id === 'reset') return;

    playerCards[0]?.classList.add('active');
    showAt(redPiece, action.start);
    rollDice(action.dice);

    if (id === 'release') later(() => {
      showCue('XÚC XẮC 6 · RA QUÂN');
      place(redPiece, action.end);
    }, 420);
    if (id === 'move') {
      showCue('DI CHUYỂN 3 Ô');
      moveAlong(redPiece, action.path.slice(1), 220);
    }

    if (id === 'special') {
      later(() => {
        showCue('DỪNG Ở Ô HOA · RÚT THẺ', 'card');
        place(redPiece, action.end);
        redPiece.classList.add('is-targeted');
      }, 220);
      later(() => revealCard(action.card), 900);
      later(() => {
        redPiece.classList.remove('is-targeted');
        showCue('THẺ: TIẾN THÊM 2 Ô', 'card');
        moveAlong(redPiece, action.cardPath, 0, 380);
      }, 1450);
      later(() => {
        if (!mobileQuery.matches) return;
        cardPanel.classList.remove('is-drawn');
        cardPanel.hidden = true;
      }, 2450);
    }

    if (id === 'capture') {
      playerCards[1]?.classList.add('active');
      showAt(greenPiece, action.opponent.start);
      greenPiece.classList.add('is-targeted');
      showCue('QUÂN LỤC ĐANG CHẮN ĐƯỜNG', 'capture');
      later(() => {
        showCue('ĐÁ QUÂN!', 'capture');
        redPiece.classList.add('is-kicking');
        place(redPiece, action.end);
      }, 520);
      later(() => {
        greenPiece.classList.remove('is-targeted');
        greenPiece.classList.add('is-captured');
        place(greenPiece, action.opponent.end);
      }, 1080);
    }

    if (id === 'finish') {
      showCue('TIẾN VÀO ĐÍCH');
      action.path.slice(1).forEach((point, index) => later(() => place(redPiece, point), 180 * (index + 1)));
    }
  };

  actionButtons.forEach((button) => button.addEventListener('click', () => {
    runAction(button.dataset.demoAction);
    if (mobileQuery.matches) hideMobileActions();
  }));
  clearStage();
}

if (typeof document !== 'undefined') initDemo();
