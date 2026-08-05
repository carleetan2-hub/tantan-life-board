#!/usr/bin/env python3
"""
爆款话题抓取脚本 - GitHub Actions 用
多策略抓取：DailyHotApi 公共实例 → 网页爬取兜底
"""
import json
import urllib.request
import urllib.error
import urllib.parse
import ssl
import re
import os
from datetime import datetime, timezone, timedelta

# 忽略 SSL 证书验证（部分公共实例证书可能有问题）
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

OUTPUT_FILE = 'hot-topics.json'

# DailyHotApi 公共实例列表
API_BASES = [
    'https://api-hot.imsyy.top',
    'https://dailyhot.cmcq.xyz',
    'https://api-hot.cricnep.tech',
    'https://hot.cricnep.tech',
    'https://dailyhot.hkg1.cdn.aliyuncs.com',
]

# 要抓取的平台
PLATFORMS = [
    ('weibo', '微博热搜'),
    ('zhihu', '知乎热榜'),
    ('douyin', '抖音热搜'),
    ('baidu', '百度热搜'),
    ('bilibili', 'B站热搜'),
    ('toutiao', '今日头条'),
    ('36kr', '36氪'),
    ('ithome', 'IT之家'),
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
}

def fetch_json(url, timeout=15):
    """抓取 JSON 数据"""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        data = resp.read().decode('utf-8')
        return json.loads(data)

def pick_list(json_data):
    """从不同 API 格式中提取列表"""
    if isinstance(json_data, list):
        return json_data
    if isinstance(json_data, dict):
        if isinstance(json_data.get('data'), list):
            return json_data['data']
        if isinstance(json_data.get('data'), dict):
            if isinstance(json_data['data'].get('list'), list):
                return json_data['data']['list']
        if isinstance(json_data.get('list'), list):
            return json_data['list']
        if isinstance(json_data.get('items'), list):
            return json_data['items']
    return []

def fetch_from_dailyhot():
    """从 DailyHotApi 公共实例抓取"""
    output = []
    success_count = 0

    for key, name in PLATFORMS:
        success = False
        for base in API_BASES:
            try:
                url = f'{base}/{key}'
                print(f'  尝试 {name}: {url}')
                data = fetch_json(url, timeout=15)
                items = pick_list(data)

                if not items:
                    print(f'    {base} 返回空列表')
                    continue

                items = items[:15]
                print(f'    ✅ {name} 抓取到 {len(items)} 条 (来源: {base})')

                for item in items:
                    output.append({
                        'platform': key,
                        'title': item.get('title') or item.get('name') or item.get('word') or item.get('desc') or '',
                        'url': item.get('url') or item.get('link') or item.get('mobileUrl') or '',
                        'hot': str(item.get('hot') or item.get('hotValue') or item.get('index') or item.get('rank') or item.get('desc') or ''),
                        'fetchedAt': datetime.now(timezone.utc).isoformat()
                    })

                success = True
                success_count += 1
                break
            except Exception as e:
                print(f'    ❌ {base} 失败: {e}')
                continue

        if not success:
            print(f'  ❌ {name} 所有 API 源均失败')

    return output, success_count


def fetch_weibo_direct():
    """直接从微博热搜页面抓取（兜底方案）"""
    try:
        url = 'https://weibo.com/ajax/side/hotSearch'
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            items = data.get('data', {}).get('realtime', [])
            output = []
            for item in items[:20]:
                title = item.get('note', '')
                if not title:
                    continue
                output.append({
                    'platform': 'weibo',
                    'title': title,
                    'url': f'https://s.weibo.com/weibo?q=%23{urllib.parse.quote(title)}%23',
                    'hot': str(item.get('num', '')),
                    'fetchedAt': datetime.now(timezone.utc).isoformat()
                })
            if output:
                print(f'  ✅ 微博直连抓取到 {len(output)} 条')
            return output
    except Exception as e:
        print(f'  ❌ 微博直连失败: {e}')
        return []


def fetch_baidu_direct():
    """直接从百度热搜抓取"""
    try:
        url = 'https://top.baidu.com/api/board?platform=wise&tab=realtime'
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            items = data.get('data', {}).get('cards', [{}])[0].get('content', [])
            output = []
            for item in items[:20]:
                title = item.get('word', '')
                if not title:
                    continue
                output.append({
                    'platform': 'baidu',
                    'title': title,
                    'url': item.get('url', ''),
                    'hot': str(item.get('hotScore', '')),
                    'fetchedAt': datetime.now(timezone.utc).isoformat()
                })
            if output:
                print(f'  ✅ 百度直连抓取到 {len(output)} 条')
            return output
    except Exception as e:
        print(f'  ❌ 百度直连失败: {e}')
        return []


def fetch_zhihu_direct():
    """直接从知乎热榜抓取"""
    try:
        url = 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=20'
        headers = {**HEADERS, 'Referer': 'https://www.zhihu.com/hot'}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            items = data.get('data', [])
            output = []
            for item in items[:20]:
                target = item.get('target', {})
                title = target.get('title', '')
                if not title:
                    continue
                output.append({
                    'platform': 'zhihu',
                    'title': title,
                    'url': f'https://www.zhihu.com/question/{target.get("id", "")}',
                    'hot': str(item.get('detail_text', '').replace('万热度', '')),
                    'fetchedAt': datetime.now(timezone.utc).isoformat()
                })
            if output:
                print(f'  ✅ 知乎直连抓取到 {len(output)} 条')
            return output
    except Exception as e:
        print(f'  ❌ 知乎直连失败: {e}')
        return []


def fetch_bilibili_direct():
    """直接从B站热搜抓取"""
    try:
        url = 'https://app.bilibili.com/x/v2/search/trending/ranking?limit=20'
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            items = data.get('data', {}).get('list', [])
            output = []
            for item in items[:20]:
                title = item.get('keyword', '')
                if not title:
                    continue
                output.append({
                    'platform': 'bilibili',
                    'title': title,
                    'url': f'https://search.bilibili.com/all?keyword={urllib.parse.quote(title)}',
                    'hot': str(item.get('position', '')),
                    'fetchedAt': datetime.now(timezone.utc).isoformat()
                })
            if output:
                print(f'  ✅ B站直连抓取到 {len(output)} 条')
            return output
    except Exception as e:
        print(f'  ❌ B站直连失败: {e}')
        return []


def fetch_douyin_direct():
    """直接从抖音热搜抓取"""
    try:
        url = 'https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/'
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            items = data.get('word_list', [])
            output = []
            for item in items[:20]:
                title = item.get('word', '')
                if not title:
                    continue
                output.append({
                    'platform': 'douyin',
                    'title': title,
                    'url': f'https://www.douyin.com/search/{urllib.parse.quote(title)}',
                    'hot': str(item.get('hot_value', '')),
                    'fetchedAt': datetime.now(timezone.utc).isoformat()
                })
            if output:
                print(f'  ✅ 抖音直连抓取到 {len(output)} 条')
            return output
    except Exception as e:
        print(f'  ❌ 抖音直连失败: {e}')
        return []


def main():
    print('=' * 60)
    print(f'爆款话题抓取 - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print('=' * 60)

    output = []
    success_platforms = 0

    # 策略1：DailyHotApi 公共实例
    print('\n📡 策略1: DailyHotApi 公共实例')
    api_output, api_success = fetch_from_dailyhot()
    if api_output:
        output.extend(api_output)
        success_platforms = api_success
        print(f'  API 策略成功: {api_success}/{len(PLATFORMS)} 个平台, 共 {len(api_output)} 条')

    # 策略2：直接网页抓取（兜底）
    if not output or success_platforms < 3:
        print('\n🌐 策略2: 直接网页抓取（兜底）')
        direct_fetchers = [
            ('微博', fetch_weibo_direct),
            ('百度', fetch_baidu_direct),
            ('知乎', fetch_zhihu_direct),
            ('B站', fetch_bilibili_direct),
            ('抖音', fetch_douyin_direct),
        ]
        for name, fetcher in direct_fetchers:
            # 如果 API 已经成功抓取了这个平台，跳过
            existing_platforms = set(item['platform'] for item in output)
            direct_items = fetcher()
            if direct_items:
                # 去重：只添加 API 没有抓到的
                new_items = [item for item in direct_items if item['platform'] not in existing_platforms]
                if new_items:
                    output.extend(new_items)
                    success_platforms += 1

    # 去重
    seen = set()
    unique_output = []
    for item in output:
        key = f"{item.get('platform', '')}|{item.get('title', '')}"
        if key not in seen and item.get('title'):
            seen.add(key)
            unique_output.append(item)

    print(f'\n📊 总计: {len(unique_output)} 条热点 (成功 {success_platforms} 个平台)')

    if not unique_output:
        print('❌ 所有抓取策略均失败')
        # 不覆盖已有文件
        if os.path.exists(OUTPUT_FILE):
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing = json.load(f)
            if existing:
                print(f'  保留已有数据: {len(existing)} 条')
        return

    # 写入文件
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(unique_output, f, ensure_ascii=False, indent=2)

    print(f'✅ 已写入 {OUTPUT_FILE}: {len(unique_output)} 条热点')


if __name__ == '__main__':
    main()
