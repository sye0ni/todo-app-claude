# 오늘 할 일

Supabase를 백엔드로 사용하는 바닐라 JS 할 일 관리 앱.

**배포 URL:** https://sye0ni.github.io/todo-app-claude/

---

## 주요 기능

- **할 일 CRUD** — 추가·인라인 수정·삭제
- **우선순위** — 높음 / 중간 / 낮음 3단계 설정 및 배지 표시
- **드래그 앤 드롭** — 순서 변경 후 DB에 즉시 반영
- **우선순위 정렬** — 높음 → 중간 → 낮음 순 일괄 정렬
- **완료 체크** — 체크박스로 완료 토글
- **인증** — 이메일/비밀번호 가입·로그인, GitHub OAuth 소셜 로그인
- **사용자별 데이터 분리** — Row Level Security(RLS)로 본인 할 일만 접근

---

## 기술 스택

| 구분 | 내용 |
|------|------|
| 프론트엔드 | HTML5, CSS3, Vanilla JS (ES2020+) |
| 스타일 | Material Design (CSS 변수 기반), Google Fonts Roboto |
| 백엔드 | [Supabase](https://supabase.com) (PostgreSQL + Auth) |
| 인증 | Supabase Auth — 이메일/비밀번호, GitHub OAuth |
| 배포 | GitHub Pages |

---

## 파일 구조

```
todo-app-claude/
├── index.html      # 메인 앱 (할 일 목록)
├── login.html      # 로그인 페이지
├── signup.html     # 회원가입 페이지
├── style.css       # 전체 스타일 (Material Design)
├── app.js          # 할 일 CRUD·정렬·드래그 로직
├── auth.js         # 세션 확인·로그아웃·OAuth 헬퍼
└── config.js       # Supabase URL·anon key (gitignore 대상, 직접 생성)
```

---

## 로컬 실행

`file://`로 직접 열면 Supabase API 호출이 차단된다. 반드시 로컬 서버로 실행한다.

```bash
# 1. 저장소 클론
git clone git@github.com:sye0ni/todo-app-claude.git
cd todo-app-claude

# 2. config.js 생성 (Supabase 콘솔 → Settings → API에서 값 복사)
cat > config.js << 'EOF'
const SUPABASE_URL = 'https://<project-id>.supabase.co';
const SUPABASE_ANON_KEY = '<anon-key>';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
EOF

# 3. 로컬 서버 실행
python3 -m http.server 8080
# → http://localhost:8080
```

---

## Supabase 설정

### 테이블 생성

Supabase 콘솔 → SQL Editor에서 아래 SQL을 실행한다.

```sql
create table todos (
  id         bigint generated always as identity primary key,
  text       text        not null,
  completed  boolean     not null default false,
  priority   text        not null default 'medium'
               check (priority in ('high', 'medium', 'low')),
  position   integer     not null default 0,
  user_id    uuid        references auth.users(id),
  created_at timestamptz not null default now()
);

-- RLS 활성화
alter table todos enable row level security;

-- 본인 데이터만 접근 허용
create policy "own todos only"
  on todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### GitHub OAuth 설정

1. GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**
2. **Authorization callback URL**: `https://<project-id>.supabase.co/auth/v1/callback`
3. 발급된 Client ID·Secret을 Supabase 콘솔 → Authentication → Providers → GitHub에 입력

자세한 절차는 [`SUPABASE.md`](SUPABASE.md)를 참고한다.

---

## 데이터 흐름

```
Supabase DB (todos 테이블)
  → loadTodos()      앱 시작 시 1회, position 순 조회
  → todos[]          in-memory 단일 소스
  → Supabase DB      추가·수정·삭제·드래그 후 즉시 비동기 저장
  → renderTodos()    DOM 전체 재렌더링
```

---

## GitHub Pages 배포

배포 전 Supabase 인증 설정(Site URL, Redirect URL) 업데이트가 필요하다. 전체 절차는 [`GITHUB_PAGES.md`](GITHUB_PAGES.md)를 참고한다.

```bash
git add index.html login.html signup.html style.css app.js auth.js
git commit -m "feat: ..."
git push origin main
# → GitHub Actions가 자동으로 GitHub Pages에 배포
```
