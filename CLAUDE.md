# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 실행 방법

`file://`로 직접 열면 Supabase API 호출이 차단된다. 반드시 로컬 서버로 실행한다.

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

## Git 규칙

- 브랜치 통합 시 **rebase 대신 merge** 를 사용한다.
- git 작업 시 이 디렉토리(`src/exercise/sye0ni/day02/todo/`) 이하의 파일만 다룬다. 상위 디렉토리나 다른 경로를 탐색하지 않는다.
- `config.js`는 `.gitignore` 대상이다. 커밋하지 않는다.

## 코드 구조

| 파일 | 역할 |
|------|------|
| `index.html` | 앱 구조. App Bar, 입력 영역, 리스트 영역을 포함 |
| `style.css` | 머티리얼 디자인 스타일. CSS 변수로 색상·elevation 토큰 정의 |
| `app.js` | 모든 로직. 상태(`todos` 배열)를 메모리에 유지하고 Supabase와 동기화 |
| `config.js` | Supabase URL·anon key (gitignore 대상, 직접 생성 필요) |

### config.js 형식

```js
const SUPABASE_URL = 'https://<project-id>.supabase.co';
const SUPABASE_ANON_KEY = '<anon-key>';
```

### 데이터 흐름

```
Supabase DB (todos 테이블)
  → loadTodos()     (앱 시작 시 1회, position 순 정렬)
  → todos[]         (in-memory 단일 소스)
  → Supabase DB     (추가·수정·삭제·정렬·드래그 후 즉시 비동기 저장)
  → renderTodos()   (DOM 전체 재렌더링)
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

### 할일 객체 스키마 (JS)

```js
{ id: number, text: string, completed: boolean, priority: 'high' | 'medium' | 'low', position: number }
```

### 주요 함수 (app.js)

- `loadTodos()` — Supabase에서 position 순으로 전체 조회 후 렌더
- `renderTodos()` — DOM 전체 재구성. 드래그앤드롭 이벤트도 여기서 바인딩
- `enterEditMode(li, todo)` — 항목을 인라인 편집 모드로 전환
- `addTodo()` — Supabase insert 후 in-memory 배열에 push
- `toggleTodo(id)` — completed 토글, Supabase update
- `deleteTodo(id)` — Supabase delete 후 배열에서 제거
- `updateTodo(id, text, priority)` — Supabase update 후 재렌더
- `updatePositions()` — todos 배열 순서를 position 컬럼에 일괄 반영
- `sortByPriority()` — high→medium→low 정렬 후 updatePositions()
- 드래그앤드롭: `draggedId` 전역 변수로 출발지 추적, `drop`에서 splice 후 updatePositions()

## 참고 문서

- `SUPABASE.md` — Supabase 프로젝트 설정 및 마이그레이션 가이드
- `GITHUB_PAGES.md` — GitHub Pages 배포 절차
