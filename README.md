# 오늘 할 일 (Todo App)

Supabase를 백엔드로 사용하는 Material Design 스타일의 할 일 관리 앱.
이메일/비밀번호 인증과 GitHub 소셜 로그인을 지원하며, GitHub Pages에 배포할 수 있다.

**배포 URL:** https://sye0ni.github.io/todo-app-claude/

---

## 주요 기능

- 할 일 추가 / 수정 / 삭제
- 완료 체크박스 토글
- 우선순위 설정 (높음 / 중간 / 낮음)
- 우선순위 기준 정렬
- 드래그앤드롭으로 순서 변경 (순서는 Supabase에 영구 저장)
- 이메일 + 비밀번호 회원가입 / 로그인
- GitHub 소셜 로그인 (OAuth)
- 로그인 사용자별 데이터 격리 (Row Level Security)
- 반응형 레이아웃 (모바일 지원)
- 애니메이션 그라디언트 배경

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| UI | Vanilla JS, HTML5, CSS3 |
| 디자인 시스템 | Material Design (직접 구현, 외부 컴포넌트 라이브러리 없음) |
| 폰트 / 아이콘 | Google Fonts (Roboto), Material Icons |
| 백엔드 / DB | Supabase (PostgreSQL + Auth) |
| 인증 | Supabase Auth — 이메일/비밀번호, GitHub OAuth |
| 배포 | GitHub Pages |

---

## 소스코드 구조

```
todo/
├── index.html      # 메인 앱 화면 (App Bar, 입력 영역, 할 일 목록)
├── login.html      # 로그인 화면 (이메일 로그인, GitHub 소셜 로그인)
├── signup.html     # 회원가입 화면
├── style.css       # 전체 스타일 (Material Design 토큰, 인증 화면 포함)
├── app.js          # 핵심 로직 (CRUD, 드래그앤드롭, 정렬, 렌더링)
├── auth.js         # 인증 헬퍼 (requireAuth, signOut, signInWithOAuth)
├── config.js       # Supabase URL / anon key — gitignore 대상, 직접 생성 필요
├── .gitignore
├── CLAUDE.md       # Claude Code 작업 지침
├── SUPABASE.md     # Supabase 프로젝트 설정 가이드
├── OAUTH.md        # GitHub OAuth 설정 가이드
└── GITHUB_PAGES.md # GitHub Pages 배포 절차
```

### 파일별 역할

**`app.js`** — 모든 UI 로직과 Supabase 통신을 담당한다.

| 함수 | 설명 |
|------|------|
| `loadTodos()` | Supabase에서 position 순으로 전체 조회 후 렌더 |
| `renderTodos()` | DOM 전체 재구성. 드래그앤드롭 이벤트 바인딩 포함 |
| `addTodo()` | Supabase insert 후 in-memory 배열에 push |
| `toggleTodo(id)` | completed 토글, Supabase update |
| `deleteTodo(id)` | Supabase delete 후 배열에서 제거 |
| `updateTodo(id, text, priority)` | Supabase update 후 재렌더 |
| `enterEditMode(li, todo)` | 항목을 인라인 편집 모드로 전환 |
| `sortByPriority()` | high → medium → low 정렬 후 updatePositions() |
| `updatePositions()` | todos 배열 순서를 position 컬럼에 일괄 반영 |

**`auth.js`** — 인증 관련 헬퍼 함수 3개.

```js
requireAuth()          // 세션 없으면 login.html로 리다이렉트
signOut()              // 로그아웃 후 login.html로 이동
signInWithOAuth(provider) // 'github' 등 OAuth 로그인 시작
```

### 데이터 흐름

```
Supabase DB (todos 테이블)
  → loadTodos()     앱 시작 시 1회, position 순 정렬
  → todos[]         in-memory 단일 소스
  → Supabase DB     추가·수정·삭제·정렬·드래그 후 즉시 비동기 저장
  → renderTodos()   DOM 전체 재렌더링
```

### Supabase 테이블 스키마

```sql
create table todos (
  id         bigint generated always as identity primary key,
  text       text        not null,
  completed  boolean     not null default false,
  priority   text        not null default 'medium'
               check (priority in ('high', 'medium', 'low')),
  position   integer     not null default 0,
  created_at timestamptz not null default now()
);
```

---

## 로컬 실행

`file://`로 직접 열면 Supabase API 호출이 차단된다. 반드시 로컬 서버로 실행한다.

### 1. config.js 생성

```js
// config.js
const SUPABASE_URL = 'https://<project-id>.supabase.co';
const SUPABASE_ANON_KEY = '<anon-key>';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Supabase 대시보드 → **Settings → API** 에서 Project URL과 anon key를 확인한다.

### 2. 로컬 서버 시작

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

---

## 인증

### 이메일 / 비밀번호

- **회원가입** (`signup.html`): 이메일 + 비밀번호(6자 이상) 입력 → 인증 메일 발송
- **로그인** (`login.html`): 이메일 + 비밀번호 입력 → 세션 발급 → `index.html`로 이동

### GitHub 소셜 로그인

```
"GitHub로 계속하기" 버튼 클릭
  → signInWithOAuth('github') 호출
  → Supabase가 GitHub 인증 페이지로 리다이렉트
  → 사용자가 GitHub에서 권한 승인
  → Supabase 콜백 → 세션 생성 → index.html로 복귀
```

GitHub OAuth를 활성화하려면 두 가지 설정이 필요하다.

1. **GitHub OAuth App 생성** (GitHub → Settings → Developer settings → OAuth Apps)
   - Authorization callback URL: `https://<project-id>.supabase.co/auth/v1/callback`
2. **Supabase에 등록** (Authentication → Providers → GitHub → Client ID/Secret 입력)

자세한 설정은 `OAUTH.md` 참고.

### 보안 — Row Level Security

로그인한 사용자는 자신의 할 일 데이터만 읽고 쓸 수 있다. (Supabase RLS `own todos only` 정책)

```sql
create policy "own todos only"
  on todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## GitHub Pages 배포

배포 전 아래 항목을 준비한다.

- [ ] Supabase 프로젝트 및 테이블 생성 (`SUPABASE.md`)
- [ ] GitHub OAuth App 생성 (`OAUTH.md`)
- [ ] `config.js` 파일 준비

### 배포 절차

```bash
# 1. 배포용 레포 클론
git clone git@github.com:sye0ni/todo-app-claude.git ~/work/todo-app-claude
cd ~/work/todo-app-claude

# 2. 앱 파일 복사
TODO_SRC=~/work/kosa-vibecoding-2026-3rd/src/exercise/sye0ni/day02/todo
cp $TODO_SRC/{index.html,login.html,signup.html,style.css,app.js,auth.js,config.js} .

# 3. 커밋 & 푸시
git add index.html login.html signup.html style.css app.js auth.js config.js
git commit -m "feat: todo app with supabase auth"
git push origin main
```

푸시 후 GitHub 레포 → **Settings → Pages → Source: main / root** 로 설정하면 자동 배포된다.

배포 후 Supabase URL Configuration에 GitHub Pages URL을 추가해야 소셜 로그인 리다이렉트가 정상 동작한다.

자세한 단계별 절차는 `GITHUB_PAGES.md` 참고.

---

## 주의사항

| 항목 | 내용 |
|------|------|
| `config.js` | `.gitignore` 대상. 메인 레포에 커밋하지 않는다 |
| Supabase anon key | RLS로 보호되므로 공개 레포에 올려도 무방하다 |
| `service_role` key | 브라우저 코드에 절대 노출하지 않는다 |
| 이메일·소셜 계정 분리 | 같은 이메일이라도 이메일 로그인과 소셜 로그인은 별개 계정으로 처리된다 (Supabase 기본 동작) |
| Redirect URL | 배포 환경이 바뀌면 Supabase URL Configuration과 GitHub OAuth App URL을 반드시 업데이트한다 |
