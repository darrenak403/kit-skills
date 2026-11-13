# Kit Skills

[English](README.md) | [Tiếng Việt](README.vi.md)

> Duy trì bởi ngothanhdat. Cài ở mức người dùng (`~/.claude/`) để mọi
> repository dùng chung một nguồn. Giấy phép: [NOTICE.md](NOTICE.md).

Kit Skills là bộ kit cài trực tiếp cho **Claude Code** và **Codex**. Kit chuẩn hóa vòng đời phát triển: hiểu codebase, ra quyết định, lập kế hoạch, triển khai, kiểm thử, review và phát hành.

Skills, rules, agents và policy dùng chung một nguồn dữ liệu. Installer tạo tích hợp riêng dưới `.claude/` và `.codex/`, vì vậy mỗi runtime chỉ nhận cấu hình mà nó hỗ trợ.

## Bắt đầu nhanh

1. Cài kit tại thư mục gốc của dự án đích.
2. Mô tả mục tiêu, phạm vi, tiêu chí hoàn thành và thời điểm cần dừng để bạn duyệt.
3. Bắt đầu với workflow core: `scout → brainstorm → plan → cook → test → code-review → ship`.

Xem hướng dẫn từng bước và ví dụ tại [GUIDE.vi.md](GUIDE.vi.md); bản tiếng Anh là [GUIDE.md](GUIDE.md).

## Cài đặt

Chạy trong thư mục gốc của dự án đích:

```powershell
irm https://raw.githubusercontent.com/darrenak403/kit-skills/main/install.ps1 | iex
```

Lệnh mặc định cài cả hai runtime. Để cài riêng:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/darrenak403/kit-skills/main/install.ps1))) --claude
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/darrenak403/kit-skills/main/install.ps1))) --codex
```

Installer chỉ thay thế thư mục runtime được chọn, giữ nguyên `.kit.json` do dự án sở hữu và không sửa `.gitignore` của dự án. Hãy review [`install.ps1`](install.ps1) trước khi thực thi mã tải từ xa; production nên pin một `-Ref` đã được kiểm duyệt.

## Thành phần của kit

- **Core skills:** khảo sát, brainstorm, lập kế hoạch, triển khai, sửa lỗi, test, review, worktree, advisory và ship.
- **Skills chuyên biệt:** được core workflow tự gọi khi phù hợp; không cần nhớ như một workflow riêng.
- **Subagents:** góc nhìn chuyên biệt cho planning, research, implementation, review, docs và delivery.
- **Tích hợp runtime:** adapters tách riêng cho Claude Code/Codex nhưng dùng policy chung.
- **Guard rails:** bảo vệ privacy, broad scan, secret output, session state, development rules và simplify.

## Dành cho quy trình giao hàng có chủ đích

Kit Skills giúp một phiên làm việc với agent dễ audit và dễ bàn giao hơn. Kit đặt công việc trên nền codebase hiện có, làm rõ giả định và đánh đổi trước implementation, giữ plan/xác minh gần thay đổi, và duy trì các điểm phê duyệt quan trọng của con người. Cùng một workflow hoạt động cho lỗi regression cô lập, tính năng nhiều phase hoặc release từ nhánh đã được review.

## Cấu hình và an toàn

`.kit.json` là cấu hình do dự án sở hữu; schema ở [`schemas/kit-config.schema.json`](schemas/kit-config.schema.json). Tệp này điều khiển ngôn ngữ, plan, đường dẫn artifact, simplify và hooks.

Hooks mặc định giúp bảo vệ khi đọc tệp có khả năng chứa secret, quét quá rộng, lộ secret trong prompt, hoặc ship diff lớn chưa được đơn giản hóa. Tắt hook sẽ giảm mức bảo vệ. Kit không thay thế quyền truy cập, CI, human review, quản lý secrets hay phê duyệt phát hành.

Trước các thao tác có thể tác động dữ liệu/remote state—đăng GitHub review, push/merge/deploy, migration hoặc dùng dịch vụ ngoài—hãy yêu cầu agent dừng và nêu thay đổi dự kiến, rủi ro, rollback và lệnh xác minh.

## Tài liệu

| Tài liệu | English | Tiếng Việt |
| --- | --- | --- |
| Bắt đầu và workflows | [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md) |
| Cấu hình dự án | [`.kit.json`](.kit.json) | [`.kit.json`](.kit.json) |
| Schema cấu hình | [schema](schemas/kit-config.schema.json) | [schema](schemas/kit-config.schema.json) |
| Tham chiếu skills | [`skills/`](skills/) | [`skills/`](skills/) |

## Phạm vi

Kit Skills giúp quy trình kỹ thuật có chủ đích và nhất quán hơn. Luôn review thay đổi trước khi merge, không đưa secrets vào prompt/repository, và điều chỉnh kit theo yêu cầu của tổ chức.
