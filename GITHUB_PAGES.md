# GitHub Pages 배포 가이드

배포 완료 후 접속 URL: **https://sye0ni.github.io/todo-app-claude/**

---

## 배포 전 체크리스트

- [ ] Supabase 프로젝트 생성 및 테이블 설정 완료 (`SUPABASE.md` 참고)
- [ ] GitHub OAuth App 생성 완료 (`OAUTH.md` 참고)
- [ ] `config.js` 파일이 로컬에 존재하는지 확인

---

## 1단계 — GitHub에 빈 레포 생성

브라우저에서 진행한다.

1. `https://github.com/new` 접속
2. 아래 값 입력:

   | 항목 | 값 |
   |------|----|
   | Repository name | `todo-app-claude` |
   | Visibility | **Public** |
   | Initialize this repository | **체크 안 함** |

3. **Create repository** 클릭

---

## 2단계 — ~/work에 클론

```bash
cd ~/work
git clone git@github.com:sye0ni/todo-app-claude.git
cd todo-app-claude
```

> 이미 `todo-app-claude` 디렉토리가 존재하면 클론 없이 바로 이동한다.
>
> ```bash
> cd ~/work/todo-app-claude
> git remote -v   # origin URL 확인
> ```
>
> remote가 HTTPS(`https://github.com/...`)로 되어 있으면 SSH로 전환한다.
>
> ```bash
> git remote set-url origin git@github.com:sye0ni/todo-app-claude.git
> ```

---

## 3단계 — 앱 파일 전체 복사

```bash
TODO_SRC=~/work/kosa-vibecoding-2026-3rd/src/exercise/sye0ni/day02/todo

cp $TODO_SRC/index.html .
cp $TODO_SRC/login.html .
cp $TODO_SRC/signup.html .
cp $TODO_SRC/style.css .
cp $TODO_SRC/app.js .
cp $TODO_SRC/auth.js .
cp $TODO_SRC/config.js .
```

---

## 4단계 — config.js 커밋 허용

`config.js`에는 Supabase **anon (public) 키**만 들어 있다.
이 키는 RLS로 보호되므로 공개 저장소에 올려도 안전하다.

```bash
echo "!config.js" >> .gitignore   # .gitignore가 있는 경우
git status                         # config.js가 staged로 보여야 한다
```

---

## 5단계 — 커밋 & 푸시

```bash
git add index.html login.html signup.html style.css app.js auth.js config.js
git commit -m "feat: todo app with supabase auth"
git push origin main
```

---

## 6단계 — GitHub Pages 활성화

1. `https://github.com/sye0ni/todo-app-claude/settings/pages` 접속
2. **Source** → `Deploy from a branch`
3. **Branch** → `main` / `/ (root)`
4. **Save**

---

## 7단계 — Supabase URL 설정 업데이트

GitHub Pages URL이 확정되면 Supabase 설정을 반드시 업데이트해야 로그인이 정상 동작한다.

**Authentication → URL Configuration**

| 항목 | 값 |
|------|----|
| Site URL | `https://sye0ni.github.io/todo-app-claude` (배포용으로 교체) |
| Redirect URLs | `http://localhost:8080/index.html` (기존 유지) |
| Redirect URLs | `https://sye0ni.github.io/todo-app-claude/index.html` (추가) |

> **Site URL은 하나만** 설정 가능하므로 배포용으로 교체한다.
> **Redirect URLs는 여러 개** 등록할 수 있으므로 로컬 값을 삭제하지 않고 배포용을 추가한다.
> Site URL이 배포용이어도 Redirect URLs에 `localhost`가 있으면 로컬 개발 시 리다이렉트가 정상 동작한다.

---

## 8단계 — GitHub OAuth App URL 업데이트

GitHub → Settings → Developer settings → OAuth Apps → `todo-app-claude`

| 항목 | 변경 값 |
|------|---------|
| Homepage URL | `https://sye0ni.github.io/todo-app-claude` |
| Authorization callback URL | 변경 없음 (Supabase URL 그대로) |

---

## 9단계 — 배포 확인

브라우저에서 직접 접속:

```
https://sye0ni.github.io/todo-app-claude/
```

> 첫 배포는 1~2분 소요된다. 진행 상황은 GitHub → Actions 탭에서 확인.

---

## 이후 파일 업데이트 방법

소스 파일을 수정한 뒤 배포 레포에 반영하는 절차:

```bash
cd ~/work/todo-app-claude

TODO_SRC=~/work/kosa-vibecoding-2026-3rd/src/exercise/sye0ni/day02/todo
cp $TODO_SRC/app.js .      # 변경된 파일만 복사
cp $TODO_SRC/auth.js .

git add -u
git commit -m "feat: ..."
git push origin main
```

푸시 후 GitHub Actions가 자동으로 재배포한다.

---

## 주의사항

| 항목 | 내용 |
|------|------|
| Supabase RLS | `authenticated` 정책만 허용되어 있으므로 로그인 없이는 데이터 접근 불가 |
| Redirect URL 누락 | 7단계를 빠뜨리면 소셜/이메일 로그인 후 리다이렉트 실패 |
| GitHub OAuth Homepage | 8단계를 빠뜨려도 로그인은 되지만 GitHub OAuth 앱 정보가 부정확해짐 |
| 파일 누락 | `login.html`, `signup.html`, `auth.js` 중 하나라도 빠지면 인증 불가 |
