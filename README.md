# Autopilot — AI tự động fix bug, implement feature cho dự án của bạn

Autopilot là hệ thống quản lý task dùng AI, gồm 2 phần:

- **Web App** — Giao diện để tạo yêu cầu, theo dõi tiến độ, duyệt kết quả
- **Agent** — Chạy trên máy tính của dev, tự động nhận task và dùng AI (Claude Code) để code, commit, push

```
Bạn tạo task trên web → AI đánh giá → AI code → AI review → Deploy → Bạn xác nhận
```

---

## Phần 1: Sử dụng Web App (cho tất cả thành viên)

**URL**: [auto-pilot-tool.vercel.app](https://auto-pilot-tool.vercel.app)

### Đăng ký & Đăng nhập

1. Truy cập web app → Đăng ký tài khoản (email + mật khẩu)
2. Đăng nhập → Tạo project hoặc được mời vào project có sẵn

### Vai trò trong project

| Vai trò | Quyền |
|---------|-------|
| **Owner** | Toàn quyền: quản lý thành viên, xóa project, duyệt task |
| **Admin** | Mời thành viên, duyệt task, tạo task |
| **Editor** | Tạo task, theo dõi tiến độ |
| **Viewer** | Chỉ xem |

### Tạo task (yêu cầu)

Trên web app, bạn tạo task với các thông tin:
- **Loại**: Bug, Feature, Change Request, Improvement
- **Tiêu đề**: Mô tả ngắn gọn
- **Mô tả chi tiết**: Càng rõ ràng, AI làm càng chính xác
- **Ưu tiên**: Low / Normal / High / Critical
- **Ảnh đính kèm**: Screenshot lỗi, mockup UI (nếu có)
- **Yêu cầu duyệt**: Bật nếu muốn xem qua trước khi AI bắt đầu code

### Vòng đời của task

```
Tạo task (draft)
    ↓
🌙 Luna đánh giá chất lượng yêu cầu
    ├── Yêu cầu rõ ràng → Chuyển cho Aria
    ├── Cần bổ sung → Gửi lại cho bạn sửa
    └── Vi phạm bảo mật → Từ chối
    ↓
🎵 Aria đọc code → thiết kế → implement → commit → push branch
    ↓
⭐ Nova review code → merge/tạo PR → deploy
    ├── Code OK → Deploy → Chờ bạn xác nhận
    └── Có lỗi → Gửi lại Aria sửa (tối đa 3 lần)
    ↓
Bạn kiểm tra → Xác nhận "Done" ✓
```

### Các trạng thái task

| Trạng thái | Ý nghĩa |
|------------|---------|
| `draft` | Vừa tạo, chờ AI đánh giá |
| `qualifying` | Luna đang đánh giá |
| `needs_improvement` | Yêu cầu chưa rõ, cần bổ sung thêm |
| `qualified` | Đã duyệt, chờ Aria implement |
| `awaiting_approval` | Chờ bạn duyệt trước khi AI code |
| `in_progress` | Aria đang code |
| `implemented` | Aria code xong, chờ Nova review |
| `reviewing` | Nova đang review |
| `deployed` | Đã deploy, chờ bạn xác nhận |
| `done` | Hoàn thành ✓ |
| `failed` | Thất bại sau 3 lần thử |
| `rejected` | Bị từ chối (vi phạm bảo mật) |

### Mẹo viết yêu cầu tốt

- **Rõ ràng**: "Nút đăng nhập bị lệch sang trái 10px trên mobile" thay vì "UI bị lỗi"
- **Có context**: Mô tả bước tái hiện lỗi, hoặc mô tả rõ feature mong muốn
- **Đính kèm ảnh**: Screenshot giúp AI hiểu chính xác vấn đề
- **Một task = một vấn đề**: Tránh gộp nhiều yêu cầu vào một task

---

## Phần 2: Cài đặt Agent trên máy tính (cho dev)

Agent chạy trên máy dev, nhận task từ web app và dùng Claude Code để tự động code.

### Bước 1: Cài Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
claude login
```

Cần tài khoản Claude (Pro/Max) hoặc Anthropic API key. Chi tiết: [docs.anthropic.com/en/docs/claude-code](https://docs.anthropic.com/en/docs/claude-code/overview)

### Bước 2: Cài Agent & chạy

```bash
git clone https://github.com/nghiant8x/auto-pilot-public.git
cd auto-pilot-public
npm install
node setup.js    # Nhập API key (lấy từ web app), chọn project, đường dẫn repo
node index.js    # Chạy agent — tự động nhận task và xử lý
```

Setup wizard sẽ hỏi:
- **API Key** — Lấy từ web app: Profile → API Keys → Generate
- **Project** — Chọn project bạn muốn agent xử lý
- **Đường dẫn repo** — Thư mục chứa source code trên máy
- **Chế độ commit** — `merge` (tự merge) hoặc `pr_only` (tạo PR để review)

---

## Troubleshooting / Xử lý lỗi

### Lỗi 401 "Invalid JWT"

**Triệu chứng**: Khi agent gọi API (setup, poll, heartbeat...) bị trả về:
```json
{"code":401,"message":"Invalid JWT"}
```

**Nguyên nhân**: Supabase Gateway tự động kiểm tra header `Authorization` và coi token `ap_xxx` là JWT (không hợp lệ). Lỗi xảy ra ở Gateway, trước khi request đến được Edge Function code.

**Cách khắc phục** (dành cho người self-host Supabase):

Edge Functions cần được deploy với flag `--no-verify-jwt` để Gateway bỏ qua việc verify JWT:

```bash
# Deploy từng function
supabase functions deploy agent-projects --no-verify-jwt
supabase functions deploy agent-poll --no-verify-jwt
supabase functions deploy agent-update-task --no-verify-jwt
supabase functions deploy agent-heartbeat --no-verify-jwt
supabase functions deploy agent-update-config --no-verify-jwt
supabase functions deploy agent-signup --no-verify-jwt
supabase functions deploy api-keys --no-verify-jwt
```

Hoặc cấu hình trong `supabase/config.toml`:
```toml
[functions.agent-projects]
verify_jwt = false

[functions.agent-poll]
verify_jwt = false

[functions.agent-update-task]
verify_jwt = false

[functions.agent-heartbeat]
verify_jwt = false

[functions.agent-update-config]
verify_jwt = false

[functions.agent-signup]
verify_jwt = false

[functions.api-keys]
verify_jwt = false
```

> **Lưu ý**: Nếu bạn dùng Autopilot hosted (auto-pilot-tool.vercel.app), lỗi này đã được khắc phục ở server. Nếu vẫn gặp lỗi, hãy liên hệ admin.

### Lỗi "Claude CLI not found"

```bash
npm install -g @anthropic-ai/claude-code
claude login
```

### Agent không nhận task

1. Kiểm tra agent đang chạy: `node index.js`
2. Kiểm tra project đã được cấu hình: `node setup.js`
3. Kiểm tra task ở trạng thái `draft`, `qualified`, hoặc `implemented`
4. Kiểm tra API key còn hoạt động (chưa bị revoke)

---

## Self-hosting / Deploy Edge Functions

Nếu bạn muốn tự host Autopilot với Supabase project riêng:

### 1. Clone repo chính (private)

```bash
git clone https://github.com/nghiant8x/auto-pilot.git
cd auto-pilot
```

### 2. Link Supabase project

```bash
cd supabase
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Push database migrations

```bash
supabase db push --linked
```

### 4. Deploy Edge Functions

**Quan trọng**: Tất cả agent functions phải deploy với `--no-verify-jwt` vì chúng dùng API key auth (`ap_xxx`) thay vì Supabase JWT.

```bash
# Cách 1: Dùng script có sẵn
bash deploy-functions.sh

# Cách 2: Deploy thủ công từng function
supabase functions deploy agent-projects --no-verify-jwt
supabase functions deploy agent-poll --no-verify-jwt
supabase functions deploy agent-update-task --no-verify-jwt
supabase functions deploy agent-heartbeat --no-verify-jwt
supabase functions deploy agent-update-config --no-verify-jwt
supabase functions deploy agent-signup --no-verify-jwt
supabase functions deploy api-keys --no-verify-jwt
```

### 5. Cập nhật config agent

Trong `config.js` và `setup.js`, đổi `SUPABASE_URL` và `SUPABASE_ANON_KEY` sang project của bạn.

### 6. Test

```bash
# Test agent-signup (không cần auth)
curl -s "https://YOUR_PROJECT.supabase.co/functions/v1/agent-signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","display_name":"Test"}'

# Test agent-projects (cần API key)
curl -s "https://YOUR_PROJECT.supabase.co/functions/v1/agent-projects" \
  -H "Authorization: Bearer ap_YOUR_API_KEY"
```

---

## License

ISC
