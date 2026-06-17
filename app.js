let todos = [];
let draggedId = null;
let currentUserId = null;

const priorityMap = { high: '높음', medium: '중간', low: '낮음' };

async function loadTodos() {
  const { data, error } = await db
    .from('todos')
    .select('*')
    .order('position');
  if (error) { console.error(error); return; }
  todos = data ?? [];
  renderTodos();
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  const emptyMsg = document.getElementById('empty-msg');

  list.innerHTML = '';

  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    li.dataset.id = todo.id;
    li.draggable = true;

    li.addEventListener('dragstart', (e) => {
      draggedId = todo.id;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      document.querySelectorAll('.todo-item').forEach((el) => el.classList.remove('drag-over'));
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.todo-item').forEach((el) => el.classList.remove('drag-over'));
      if (todo.id !== draggedId) li.classList.add('drag-over');
    });
    li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
    li.addEventListener('drop', async (e) => {
      e.preventDefault();
      li.classList.remove('drag-over');
      if (draggedId === null || draggedId === todo.id) return;
      const fromIdx = todos.findIndex((t) => t.id === draggedId);
      const toIdx = todos.findIndex((t) => t.id === todo.id);
      todos.splice(toIdx, 0, todos.splice(fromIdx, 1)[0]);
      renderTodos();
      await updatePositions();
    });

    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '⠿';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const badge = document.createElement('span');
    badge.className = `priority-badge priority-${todo.priority || 'medium'}`;
    badge.textContent = priorityMap[todo.priority] || '중간';

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn edit-btn';
    editBtn.innerHTML = '<span class="material-icons">edit</span>';
    editBtn.title = '수정';
    editBtn.addEventListener('click', () => enterEditMode(li, todo));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete-btn';
    deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
    deleteBtn.title = '삭제';
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.appendChild(handle);
    li.appendChild(checkbox);
    li.appendChild(badge);
    li.appendChild(span);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });

  emptyMsg.classList.toggle('visible', todos.length === 0);
}

function enterEditMode(li, todo) {
  li.classList.add('editing');
  li.innerHTML = '';

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.className = 'edit-text-input';
  textInput.value = todo.text;

  const prioritySelect = document.createElement('select');
  prioritySelect.className = 'edit-priority-select';
  ['high', 'medium', 'low'].forEach((val) => {
    const option = document.createElement('option');
    option.value = val;
    option.textContent = priorityMap[val];
    if (val === (todo.priority || 'medium')) option.selected = true;
    prioritySelect.appendChild(option);
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'save-btn';
  saveBtn.textContent = '저장';
  saveBtn.addEventListener('click', () => {
    const newText = textInput.value.trim();
    if (!newText) { textInput.focus(); return; }
    updateTodo(todo.id, newText, prioritySelect.value);
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cancel-btn';
  cancelBtn.textContent = '취소';
  cancelBtn.addEventListener('click', () => renderTodos());

  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
    if (e.key === 'Escape') cancelBtn.click();
  });

  li.appendChild(textInput);
  li.appendChild(prioritySelect);
  li.appendChild(saveBtn);
  li.appendChild(cancelBtn);
  textInput.focus();
  textInput.select();
}

async function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;

  const priority = document.getElementById('priority-select').value;
  const position = todos.length;

  const { data, error } = await db
    .from('todos')
    .insert({ text, priority, position, completed: false, user_id: currentUserId })
    .select()
    .single();

  if (error) { console.error(error); return; }
  todos.push(data);
  renderTodos();
  input.value = '';
  input.focus();
}

async function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  const { error } = await db
    .from('todos')
    .update({ completed: !todo.completed })
    .eq('id', id);

  if (error) { console.error(error); return; }
  todo.completed = !todo.completed;
  renderTodos();
}

async function deleteTodo(id) {
  const { error } = await db
    .from('todos')
    .delete()
    .eq('id', id);

  if (error) { console.error(error); return; }
  todos = todos.filter((t) => t.id !== id);
  renderTodos();
}

async function updateTodo(id, text, priority) {
  const { error } = await db
    .from('todos')
    .update({ text, priority })
    .eq('id', id);

  if (error) { console.error(error); return; }
  const todo = todos.find((t) => t.id === id);
  if (todo) { todo.text = text; todo.priority = priority; }
  renderTodos();
}

async function updatePositions() {
  await Promise.all(
    todos.map((todo, idx) =>
      db.from('todos').update({ position: idx }).eq('id', todo.id)
    )
  );
}

async function sortByPriority() {
  const order = { high: 0, medium: 1, low: 2 };
  todos.sort((a, b) => (order[a.priority || 'medium']) - (order[b.priority || 'medium']));
  renderTodos();
  await updatePositions();
}

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth();
  if (!session) return;

  currentUserId = session.user.id;
  document.getElementById('user-email').textContent = session.user.email;
  document.getElementById('logout-btn').addEventListener('click', signOut);

  loadTodos();

  document.getElementById('add-btn').addEventListener('click', addTodo);
  document.getElementById('sort-btn').addEventListener('click', sortByPriority);

  document.getElementById('todo-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodo();
  });
});
