# Supabase 마이그레이션 가이드

localStorage → Supabase로 데이터 저장소를 전환하는 절차와 테이블 설계를 정리한다.

---

## 1. Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 에서 GitHub 계정으로 가입
2. **New Project** 클릭
3. 프로젝트 이름: `todo-app` (자유롭게 설정)
4. Database Password: 안전한 비밀번호 설정 후 복사해 둘 것
5. Region: **Northeast Asia (Seoul)** 선택
6. **Create new project** 클릭 → 약 1분 대기

---

## 2. API 키 확인

프로젝트 생성 후 **Settings → API** 메뉴에서 아래 두 값을 복사한다.

| 항목 | 설명 | 사용 위치 |
|------|------|-----------|
| `Project URL` | `https://<id>.supabase.co` 형태 | `app.js` 내 `SUPABASE_URL` |
| `anon / public` 키 | 공개 API 키 (Row Level Security로 보호) | `app.js` 내 `SUPABASE_ANON_KEY` |

> `service_role` 키는 서버에서만 사용한다. 브라우저 코드에 절대 노출하지 않는다.

---

## 3. 테이블 설계

### 3-1. 현재 데이터 스키마 (localStorage)

```js
{ id: number, text: string, completed: boolean, priority: 'high' | 'medium' | 'low' }
```

### 3-2. 제안 테이블: `todos`

**Table Editor → New Table** 또는 SQL Editor에서 아래 SQL을 실행한다.

```sql
create table todos (
  id         bigint generated always as identity primary key,
  text       text        not null,
  completed  boolean     not null default false,
  priority   text        not null default 'medium'
               check (priority in ('high', 'medium', 'low')),
  position   integer     not null default 0,  -- 드래그앤드롭 순서 저장
  created_at timestamptz not null default now()
);
```

#### 컬럼 설명

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | bigint (auto) | 기본 키. `Date.now()` 대신 DB가 자동 생성 |
| `text` | text | 할 일 내용 |
| `completed` | boolean | 완료 여부 |
| `priority` | text (check) | `'high'` / `'medium'` / `'low'` |
| `position` | integer | 드래그앤드롭 후 순서 유지용 |
| `created_at` | timestamptz | 생성 시각 (자동) |

> `position` 컬럼은 드래그앤드롭 순서를 DB에 영구 저장하기 위한 것이다.
> 현재 localStorage 버전의 배열 인덱스 역할을 대신한다.

---

## 4. Row Level Security (RLS) 설정

현재 앱은 로그인 없이 동작하므로 익명 접근을 허용하거나,
추후 인증을 붙일 경우를 대비해 RLS를 활성화한 뒤 정책을 추가한다.

### 4-1. 인증 없이 공개 접근 (빠른 프로토타이핑용)

```sql
-- RLS 활성화
alter table todos enable row level security;

-- anon 역할에 전체 CRUD 허용
create policy "public access"
  on todos for all
  to anon
  using (true)
  with check (true);
```

### 4-2. 인증 후 본인 데이터만 접근 (권장, 나중에 적용)

추후 `user_id` 컬럼을 추가하고 Supabase Auth를 붙이면 아래 정책으로 교체한다.

```sql
alter table todos add column user_id uuid references auth.users(id);

create policy "own todos only"
  on todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 5. Supabase JS SDK 추가

`index.html`의 `</body>` 직전에 CDN 스크립트를 추가한다.

```html
<!-- Supabase JS v2 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="app.js"></script>
```

---

## 6. app.js 마이그레이션 포인트

`app.js` 상단의 localStorage 코드를 Supabase 클라이언트로 교체한다.

```js
// 기존
const STORAGE_KEY = 'todos';
function loadTodos() { ... localStorage ... }
function saveTodos() { ... localStorage ... }

// 교체 후
const SUPABASE_URL  = 'https://<your-id>.supabase.co';
const SUPABASE_ANON_KEY = '<your-anon-key>';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 전체 목록 조회
async function loadTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('position');
  if (error) console.error(error);
  return data ?? [];
}

// 추가
async function addTodoToDb(text, priority, position) {
  const { data, error } = await supabase
    .from('todos')
    .insert({ text, priority, position })
    .select()
    .single();
  if (error) console.error(error);
  return data;
}

// 수정
async function updateTodoInDb(id, fields) {
  const { error } = await supabase
    .from('todos')
    .update(fields)
    .eq('id', id);
  if (error) console.error(error);
}

// 삭제
async function deleteTodoFromDb(id) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id);
  if (error) console.error(error);
}
```

> 모든 DB 호출이 `async`이므로 `addTodo`, `toggleTodo`, `deleteTodo`,
> `updateTodo`, 드래그 `drop` 핸들러도 `async function`으로 바꿔야 한다.

---

## 7. 실시간 동기화 (선택)

Supabase Realtime을 활성화하면 다른 탭·기기에서 변경된 내용이 자동으로 반영된다.

```js
supabase
  .channel('todos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => {
    loadTodos().then(data => { todos = data; renderTodos(); });
  })
  .subscribe();
```

---

## 8. 환경 변수 관리 주의사항

- `SUPABASE_URL`과 `SUPABASE_ANON_KEY`는 퍼블릭 키이므로 클라이언트에 노출해도 무방하다.
  단, RLS 정책이 올바르게 설정된 경우에 한한다.
- `.env` 파일이나 별도 `config.js`로 분리하고 `.gitignore`에 추가하는 것을 권장한다.

```
# .gitignore
config.js
```

```js
// config.js (gitignore 대상)
const SUPABASE_URL = 'https://xxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

```html
<!-- index.html -->
<script src="config.js"></script>
<script src="app.js"></script>
```
