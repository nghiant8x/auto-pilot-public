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

Agent là chương trình chạy trên máy dev, nhận task từ web app và dùng Claude Code CLI để tự động code.

### Yêu cầu

- [Node.js](https://nodejs.org/) v18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code/overview) (đã đăng nhập)
- Git (đã cấu hình)
- Repo dự án đã clone về máy

### Cài đặt

```bash
# Cách 1: Clone repo
git clone https://github.com/nghiant8x/auto-pilot-public.git
cd auto-pilot-public
npm install

# Cách 2: npm global
npm install -g autopilot-agent
```

### Thiết lập

```bash
node setup.js
# hoặc: autopilot setup
```

Setup wizard sẽ hỏi:
1. **API Key** — Lấy từ web app: Profile → API Keys → Generate
2. **Chọn project** — Chọn project bạn muốn agent xử lý
3. **Đường dẫn repo** — Thư mục chứa source code trên máy bạn
4. **Chế độ commit** — `merge` (tự merge vào main) hoặc `pr_only` (tạo PR để bạn review)

### Chạy agent

```bash
node index.js
# hoặc: autopilot start
```

Agent sẽ:
- Kết nối đến server, hiển thị trạng thái online
- Poll task mới mỗi 5 giây
- Khi có task → tự động xử lý qua pipeline Luna → Aria → Nova
- Hiển thị log realtime trên terminal

### Agent làm gì trên máy bạn?

```
Agent poll task mới
    ↓
🌙 Luna: Đánh giá yêu cầu (chỉ đọc code, không sửa)
    ↓
🎵 Aria: Tạo branch → đọc code → implement → commit → push
    ↓
⭐ Nova: Review diff → merge hoặc tạo PR → deploy (nếu cấu hình)
```

- **Luna** chỉ đọc code (Read, Glob, Grep) — không sửa gì
- **Aria** có quyền đọc/sửa code, chạy lệnh build trong thư mục project
- **Nova** review diff, merge branch, chạy lệnh deploy
- Tất cả hoạt động **trong thư mục project** — không truy cập file ngoài

### Bảo mật

- Agent chỉ hoạt động trong thư mục project đã cấu hình
- Luna kiểm tra bảo mật yêu cầu trước khi cho Aria code
- Aria/Nova bị giới hạn: không truy cập file ngoài project, không chạy lệnh mạng, không đọc secrets
- Xác thực bằng API Key — mỗi user có key riêng
- Mọi thay đổi đều qua git branch — dễ review và rollback

### Lệnh hữu ích

```bash
autopilot start    # Chạy agent
autopilot status   # Xem cấu hình hiện tại
autopilot setup    # Cấu hình lại
```

---

## License

ISC
