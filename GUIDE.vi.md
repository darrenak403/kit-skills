# Hướng dẫn sử dụng Kit Skills

[English](GUIDE.md) | [Tiếng Việt](GUIDE.vi.md)

Kit Skills là bộ kit cài trực tiếp vào một dự án để dùng với Claude Code, Codex, hoặc cả hai. Kit cung cấp skills, subagents và hooks dùng chung; các tệp tích hợp dưới `.claude/` và `.codex/` được tạo riêng cho từng runtime.

## Cấu hình bộ kit

Sau khi cài theo [README.vi.md](README.vi.md#cài-đặt), kiểm tra `.kit.json` ở gốc dự án. Đây là nguồn cấu hình duy nhất do dự án sở hữu; schema chính thức là [`schemas/kit-config.schema.json`](schemas/kit-config.schema.json). Giữ trường `$schema` để editor gợi ý và kiểm tra cấu hình.

| Thiết lập | Mặc định / ví dụ | Dùng để |
| --- | --- | --- |
| `codingLevel` | `-1`, hoặc `0`–`5` | Điều chỉnh độ sâu giải thích, từ ELI5 đến tech-lead/god-mode. |
| `locale.thinkingLanguage`, `locale.responseLanguage` | `null`, ví dụ `"vi"` | Đặt ngôn ngữ suy luận/phản hồi khi runtime hỗ trợ. |
| `docs.maxLoc` | `800` | Độ dài tối đa mong muốn của một file tài liệu. |
| `paths.docs`, `paths.plans` | `"docs"`, `"plans"` | Khớp vị trí docs và plans với quy ước dự án. |
| `project.type`, `packageManager`, `framework` | `"auto"` | Ghi đè auto-detection khi dự án mơ hồ hoặc nhận diện sai. |
| `plan` | naming, resolution, validation | Tên plan, nhận diện branch, số câu hỏi và focus areas. |
| `simplify` | thresholds và gate verbs | Cảnh báo/chặn ship khi diff lớn hoặc phức tạp bất thường. |
| `hooks` | tám khóa `true`/`false` | Bật/tắt hooks bảo vệ và quản lý session. |
| `trust` | tắt mặc định | Trust mode; chỉ bật khi đội đã có policy được review. |
| `subagent.agents` | context prefix tùy chọn | Thêm ngữ cảnh riêng cho một loại subagent. |
| `assertions` | mảng rỗng | Quy tắc nội bộ theo pattern/rule/message. |

Nên bắt đầu bằng override nhỏ, thay vì copy nguyên một cấu hình lớn:

```json
{
  "$schema": "./schemas/kit-config.schema.json",
  "codingLevel": 3,
  "locale": { "responseLanguage": "vi" },
  "paths": { "docs": "docs", "plans": "plans" },
  "plan": { "validation": { "mode": "prompt" } },
  "hooks": { "privacy-block": true, "scout-block": true, "simplify-gate": true }
}
```

### Hooks, simplify và custom bên ngoài

Mặc định nên giữ cả tám hooks bật. `privacy-block` bảo vệ các file có khả năng chứa secret; `scout-block` ngăn quét quá rộng; `secret-output-guardrail` chặn đưa secret đã phát hiện vào transcript; `session-init`, `subagent-init`, `session-state` duy trì context; `dev-rules-reminder` nạp lại rules; `simplify-gate` kiểm tra diff lớn.

Các ngưỡng `simplify.threshold.locDelta`, `fileCount`, `singleFileLoc` mô tả một diff bất thường. `simplify.gate.hardVerbs` chặn các prompt tác động mạnh như ship/merge/deploy khi vượt ngưỡng, còn `softVerbs` chỉ cảnh báo. Hãy tinh chỉnh theo kích thước thay đổi bình thường của repo, không phải để né cảnh báo.

Tích hợp bên ngoài cần được kiểm tra authentication, chính sách dữ liệu, chi phí và việc context có được phép rời máy hay không. Gemini là opt-in: chỉ đặt `skills.research.useGemini: true` khi Gemini CLI hoạt động; chỉ dùng `kit:scout ext` khi đã có chấp thuận rõ ràng. Không lưu token, password hoặc API key trong `.kit.json`.

Để custom theo dự án, ưu tiên `.kit.json`, rules dự án và cấu hình riêng dưới `skills.<skill-name>`. Custom native cho Claude/Codex nên tách khỏi source kit vì thư mục `.claude/` hoặc `.codex/` được tạo lại ở lần cài sau. Validate thay đổi theo schema và commit cấu hình nếu nó là quy ước chung của đội.

## Cách dùng

Không cần nhớ slash command. Hãy mô tả mục tiêu, phạm vi và tiêu chí hoàn thành; agent sẽ chọn skill phù hợp dựa trên metadata của skill. Ví dụ:

```text
Khảo sát module thanh toán, chỉ ra các luồng dữ liệu và rủi ro bảo mật.
```

```text
Lập kế hoạch triển khai OAuth, nêu giả định, trade-off, thay đổi file và chiến lược kiểm thử trước khi sửa mã.
```

```text
Sửa lỗi API trả 500 khi thiếu trường email. Tái hiện lỗi, tìm nguyên nhân gốc, viết test hồi quy rồi thực hiện bản sửa tối thiểu.
```

Bạn cũng có thể nêu rõ skill hoặc chuyên môn mong muốn, chẳng hạn `dùng kit-plan`, `nhờ code-reviewer review diff`, hoặc `mời advisor phản biện kiến trúc`.

## Bắt đầu cho người mới

### 1. Bắt đầu ở đúng chỗ

Mở Claude Code hoặc Codex tại thư mục gốc của dự án đã cài kit. Đừng bắt đầu bằng “sửa giúp tôi”; hãy cho agent đủ ngữ cảnh để biết mức độ tự chủ bạn mong muốn. Một yêu cầu tốt có năm phần:

```text
Mục tiêu: <kết quả muốn có>.
Ngữ cảnh: <triệu chứng, link issue, module hoặc luồng liên quan>.
Phạm vi: <được phép sửa gì> / Không làm: <điều không được đụng tới>.
Hoàn thành khi: <test, hành vi, tiêu chí review>.
Điểm dừng: <hỏi tôi trước khi sửa | tạo plan trước | triển khai luôn>.
```

Ví dụ cho người mới:

```text
Mục tiêu: sửa lỗi đăng nhập trả 500 khi thiếu email.
Ngữ cảnh: xảy ra trên POST /api/login ở môi trường local.
Phạm vi: chỉ backend validation và test liên quan; không đổi schema database.
Hoàn thành khi: endpoint trả 400, test hồi quy pass và không làm đổi luồng đăng nhập hợp lệ.
Điểm dừng: khảo sát và giải thích nguyên nhân trước, hỏi tôi trước khi sửa mã.
```

### 2. Chọn mức độ workflow

| Mức | Dùng cho | Chuỗi nên bắt đầu | Điều bạn cần làm |
| --- | --- | --- | --- |
| Cơ bản | Lỗi nhỏ, thay đổi một khu vực, cần làm quen codebase | `scout → fix --review → test → code-review` | Đọc bản tóm tắt và duyệt nguyên nhân/bản sửa. |
| Tiêu chuẩn | Tính năng có yêu cầu tương đối rõ | `scout → plan → cook --interactive → test → code-review` | Duyệt plan trước khi code và xác nhận kết quả test. |
| Nâng cao | Nhiều phương án, thay đổi contract, migration hoặc release | `scout → brainstorm → advise → plan --deep → cook → review-pr → ship --dry-run` | Chốt quyết định, duyệt plan, kiểm tra diff và xác nhận hành động bên ngoài. |

Nếu chưa chắc, chọn mức cao hơn. Mất vài phút để scout/plan thường rẻ hơn nhiều so với sửa sai một thay đổi không rõ phạm vi.

### 3. Quy tắc an toàn tối thiểu

Luôn yêu cầu agent dừng để bạn duyệt trước khi có một trong các hành động: sửa migration/schema, xoá hoặc di chuyển dữ liệu, dùng dịch vụ bên ngoài, đăng GitHub review, push/merge/deploy, hoặc tắt hook bảo vệ. Trước các hành động đó, yêu cầu một bản tóm tắt gồm: thay đổi dự kiến, rủi ro, rollback và lệnh xác minh.

## Core skills: tags, cú pháp và flags

Agent có thể tự chọn skill từ yêu cầu tự nhiên, hoặc bạn gọi rõ theo dạng `/kit:<tag> <mục tiêu> [flags]`. Flags thay đổi cách workflow vận hành; mặc định tương tác và đầy đủ là lựa chọn an toàn. Guide này chỉ giới thiệu core skills, còn các skills theo công nghệ/domain là năng lực hỗ trợ được workflow chọn khi phù hợp.

| Core skill | Mục đích và cú pháp | Flags cơ bản và khi dùng |
| --- | --- | --- |
| `kit:scout` | Xác định code, pattern, dependency và ràng buộc: `/kit:scout <phạm-vi>` | `ext` bật Gemini CLI bên ngoài. Vì có thể gửi context ra ngoài, chỉ dùng khi đã chấp thuận. |
| `kit:brainstorm` | So sánh phương án trước khi quyết định: `/kit:brainstorm <vấn-đề>` | Không có shortcut flag: skill cố ý dừng để chờ duyệt thiết kế. |
| `kit:plan` | Tạo kế hoạch triển khai: `/kit:plan <task> [flags]` | `--fast` cho scope quen; `--deep`/`--hard` cho rủi ro cao; `--parallel` cho phases độc lập; `--tdd` cho tests-first. Dùng `red-team`/`validate` để kiểm tra plan đã xong. |
| `kit:cook` | Triển khai scope hoặc plan đã duyệt: `/kit:cook <task-or-plan> [flags]` | `--interactive` là mặc định. `--fast` bỏ research nhưng vẫn plan; `--parallel` làm phần độc lập; `--tdd` viết test trước. `--auto` bỏ điểm duyệt, `--no-test` giảm xác minh. |
| `kit:fix` | Tìm nguyên nhân gốc của lỗi: `/kit:fix <issue> [flags]` | `--review` để duyệt điểm quan trọng; `--quick` cho lỗi cô lập; `--parallel` cho nhiều lỗi độc lập. `--auto` là mặc định. |
| `kit:test` | Chạy/thiết kế kiểm thử: `/kit:test <phạm-vi>` hoặc `/kit:test ui <url>` | Nêu rõ unit, integration, e2e hoặc UI để không chạy quá rộng. |
| `kit:code-review` | Review diff, commit, PR hoặc codebase: `/kit:code-review --pending`, `#<PR>`, `<commit>`, hoặc `codebase [parallel]` | Chọn phạm vi ổn định nhỏ nhất; `--pending` là diff local hiện tại. |
| `kit:review-pr` | Review PR GitHub: `/kit:review-pr <số-PR|URL> [--fix] [--reply]` | `--fix` sửa workspace; `--reply` đăng review GitHub. Cả hai cần cho phép rõ ràng. |
| `kit:advise` | Lấy phản biện trước khi cam kết: `/kit:advise <đề-xuất> [--html|--md|--agent]` | `--html`/`--md` tạo artifact chia sẻ; `--agent` gọi advisor agent. |
| `kit:worktree` | Cô lập công việc song song: `/kit:worktree <mô-tả-tính-năng>` | Không có flag thiết yếu; dùng trước implementation song song. |
| `kit:ship` | Chuẩn bị phát hành nhánh hoàn tất: `/kit:ship [official|beta] [flags]` | Bắt đầu bằng `--dry-run`. `--skip-tests`, `--skip-review` và `--skip-*` khác làm giảm bảo vệ; không dùng cho release chính thức. |

Ví dụ gọn theo mức độ kiểm soát:

```text
/kit:plan "Tách module billing" --deep --tdd
/kit:cook plans/260823-billing-split/plan.md --interactive --tdd
/kit:code-review --pending
/kit:ship official --dry-run
```

Chuỗi chuẩn cho một thay đổi có độ bất định là:

```text
kit:scout → kit:brainstorm → kit:plan → kit:cook → kit:test → kit:code-review → kit:ship
```

Không phải tác vụ nào cũng cần đủ chuỗi. `kit:brainstorm` dừng ở quyết định và cần bạn duyệt thiết kế trước khi triển khai; `kit:plan` tạo roadmap; `kit:cook` thi hành plan đã được duyệt. Vì vậy, không nên dùng `kit:cook` để thay thế bước ra quyết định khi yêu cầu còn mơ hồ.

### Kịch bản 1: Sửa lỗi nhỏ, rủi ro thấp

Workflow: `kit:scout → kit:fix → kit:test → kit:code-review`

```text
Dùng kit:fix: API POST /users trả 500 khi email bị thiếu. Hãy tái hiện,
xác định nguyên nhân gốc, sửa tối thiểu, thêm test hồi quy và nhờ code-reviewer
kiểm tra các nhánh validation liên quan.
```

Luồng này bỏ `kit:brainstorm` và plan đầy đủ vì scope đã hẹp, nhưng vẫn khảo sát, tái hiện và có test hồi quy.

### Kịch bản 2: Tính năng có nhiều phương án

Workflow: `kit:scout → kit:brainstorm → kit:plan → kit:cook --tdd → kit:test → kit:review-pr`

```text
Dùng kit:brainstorm để chọn phương án OAuth cho ứng dụng hiện tại. Sau khi tôi
duyệt, tạo plan theo phases, rồi dùng kit:cook với --tdd để triển khai plan.
Cuối cùng chạy test và review diff như một PR.
```

Đây là luồng mặc định tốt cho feature tác động tới API, database hoặc quyền truy cập. Có thể yêu cầu `kit:advise` phản biện plan nếu quyết định khó đảo ngược.

### Kịch bản 3: Refactor hoặc migration lớn

Workflow: `kit:scout → kit:brainstorm → kit:advise → kit:plan --deep → kit:worktree → kit:cook --parallel → kit:test → kit:code-review → kit:ship`

```text
Khảo sát việc tách authentication khỏi monolith. Đề xuất phương án migration có
rollback, nhờ advisor phản biện các rủi ro contract, rồi tạo deep plan theo phase.
Chỉ triển khai sau khi plan được duyệt; tách worktree nếu cần làm song song. Trước
ship, kiểm thử integration và review các thay đổi contract.
```

`kit:worktree` giữ các nhánh công việc tách biệt. Nếu core workflow nhận diện nhu cầu về security, framework hoặc cơ sở dữ liệu, nó sẽ dùng skill hỗ trợ tương ứng; không cần đưa các skill đó vào chuỗi mặc định.

### Kịch bản 4: Quyết định kiến trúc, chưa triển khai

Workflow: `kit:scout → kit:brainstorm → kit:advise → kit:plan`

```text
Khảo sát cách hiện tại xác thực người dùng và đề xuất kiến trúc session mới. So sánh
2–3 lựa chọn, nhờ advisor phản biện khuyến nghị, rồi tạo plan thử nghiệm nhỏ. Không
viết mã trước khi tôi phê duyệt kiến trúc và kế hoạch.
```

Luồng này chủ động dừng ở plan/đề xuất để tránh biến nghiên cứu thành thay đổi mã chưa được phê duyệt.

## Vận hành hằng ngày

- Giữ yêu cầu cụ thể: mục tiêu, phạm vi không được đụng tới, tiêu chí hoàn thành và lệnh kiểm thử.
- Với thay đổi quan trọng, yêu cầu plan và review độc lập trước khi sửa; với thay đổi nhỏ, yêu cầu test hồi quy tối thiểu.
- Không đưa secrets vào prompt. Privacy và secret-output guard chỉ là lớp hỗ trợ, không thay thế quy trình quản lý secrets.
- Kiểm tra diff, test và quyền trước khi merge hoặc deploy; Kit Skills không thay thế CI, code review hay phê duyệt của con người.
