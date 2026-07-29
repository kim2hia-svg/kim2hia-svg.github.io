(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ } };

  const toggle = $('.menu-toggle');
  const navigation = $('#site-nav');
  if (toggle && navigation) {
    toggle.addEventListener('click', () => { const open = navigation.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', String(open)); });
    navigation.addEventListener('click', (event) => { if (event.target instanceof HTMLAnchorElement) { navigation.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); } });
  }

  const todoForm = $('#todo-form');
  const todoList = $('#todo-list');
  const todoCount = $('#todo-count');
  let todos = read('dashboard-todos', []);
  let todoFilter = 'all';
  const escapeText = (value) => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  const renderTodos = () => {
    const visible = todos.filter((todo) => todoFilter === 'all' || (todoFilter === 'done' ? todo.done : !todo.done));
    todoCount.textContent = `${todos.filter((todo) => !todo.done).length} open / ${todos.length} total`;
    todoList.innerHTML = visible.length ? visible.map((todo) => `<li class="item-row ${todo.done ? 'done' : ''}"><input type="checkbox" data-todo-action="toggle" data-id="${todo.id}" ${todo.done ? 'checked' : ''} aria-label="Complete ${escapeText(todo.title)}"><div><div class="item-title">${escapeText(todo.title)}</div><div class="item-meta"><span class="priority-${todo.priority}">${escapeText(todo.priority)}</span> · ${escapeText(todo.category)}${todo.due ? ` · due ${escapeText(todo.due)}` : ''}${todo.reminder ? ' · reminder' : ''}</div></div><div class="item-actions"><button class="icon-button" type="button" data-todo-action="edit" data-id="${todo.id}" aria-label="Edit ${escapeText(todo.title)}">✎</button><button class="icon-button" type="button" data-todo-action="delete" data-id="${todo.id}" aria-label="Delete ${escapeText(todo.title)}">×</button></div></li>`).join('') : '<li class="empty-state">Nothing here yet.</li>';
  };
  if (todoForm) todoForm.addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(todoForm); todos.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title: data.get('title'), category: data.get('category'), priority: data.get('priority'), due: data.get('due'), reminder: data.get('reminder') === 'on', done: false }); write('dashboard-todos', todos); todoForm.reset(); $('#todo-priority').value = 'medium'; renderTodos(); });
  if (todoList) todoList.addEventListener('click', (event) => { const target = event.target.closest('[data-todo-action]'); if (!target) return; const id = target.dataset.id; const todo = todos.find((item) => item.id === id); if (!todo) return; if (target.dataset.todoAction === 'toggle') todo.done = target.checked; if (target.dataset.todoAction === 'delete') todos = todos.filter((item) => item.id !== id); if (target.dataset.todoAction === 'edit') { const title = window.prompt('Edit task', todo.title); if (title?.trim()) todo.title = title.trim(); } write('dashboard-todos', todos); renderTodos(); });
  $$('.filter-button').forEach((button) => button.addEventListener('click', () => { $$('.filter-button').forEach((item) => item.classList.remove('active')); button.classList.add('active'); todoFilter = button.dataset.filter; renderTodos(); }));

  const calendarForm = $('#calendar-form');
  const eventList = $('#event-list');
  let events = read('dashboard-events', []);
  const renderEvents = () => { const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date)); eventList.innerHTML = sorted.length ? sorted.map((item) => `<li class="item-row"><div class="item-meta">${escapeText(item.date)}</div><div class="item-title">${escapeText(item.title)}</div><button class="icon-button" type="button" data-event-delete="${item.id}" aria-label="Delete ${escapeText(item.title)}">×</button></li>`).join('') : '<li class="empty-state">No events scheduled.</li>'; };
  if (calendarForm) calendarForm.addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(calendarForm); events.push({ id: Date.now().toString(), date: data.get('date'), title: data.get('title') }); write('dashboard-events', events); calendarForm.reset(); renderEvents(); });
  if (eventList) eventList.addEventListener('click', (event) => { const button = event.target.closest('[data-event-delete]'); if (!button) return; events = events.filter((item) => item.id !== button.dataset.eventDelete); write('dashboard-events', events); renderEvents(); });

  const contactForm = $('#contact-form');
  if (contactForm) contactForm.addEventListener('submit', (event) => { event.preventDefault(); $('#contact-status').textContent = 'Message prepared. Connect a mail endpoint when ready.'; contactForm.reset(); });
  renderTodos();
  renderEvents();
})();
