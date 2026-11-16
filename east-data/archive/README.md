# EAST 离线资料库

增量整理日期：2026-11-16。来源：EAST 公开历史网页及 Internet Archive。

打开 index.html，可按标题搜索及类型筛选；pages/ 为离线阅读页，original-html/ 保存原始HTML字节。pages.jsonl、east.sqlite（含全文索引）、citations.json与summary.json已同步更新。

当前计划 3022 页，保存 3022 页，失败 0 页，未尝试 0 页。本次恢复或新增 256 页，详情见 resume-report.md。引文出现 5676 次，明确书目ID 1084 种；网页数和ID数均不能当作独立文献总数。

最早快照 20191021043853，最晚 20260808105351（UTC）。各页日期混合，旧版与新版及不同参数页可能重复；并非后端数据库备份，也不能代表当前全库。动态接口、登录内容与无公开存档的资料不在恢复范围。

173项无旧下载日志的页面字节摘要匹配CDX中所列捕获，旧下载实际捕获时间未知；所标注日期据该匹配捕获，不表示有旧日志证实。下载日志保留全部历史行并追加本次结果，各URL末行为最新结果。本次仅包含HTML内容页，31个静态资源和端点附件候选不在本次范围。逐页来源见 download-log.jsonl 和 resume-imports.json；失败见 failed-downloads.json；尚未收录的站内链接见 unavailable-linked-pages.json（仅计EAST同域链接，排除站外及登录注册页面）。读取版移除了远程脚本、表单及媒体依赖，原始HTML仍保留供复核。

README-historical-20261112.md、retry-report.md、retry-audit.json与failed-page-alternatives.json为原备份的历史记录，其统计不代表本次增量结果。archive-index.json保留旧索引，新增范围以resume-imports.json为准。资料权利归原作者和原站点所有。
