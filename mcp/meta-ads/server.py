#!/usr/bin/env python3
"""Meta Ads MCP Server for Clicka.bg"""

import os
import json
from mcp.server.fastmcp import FastMCP
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adcreative import AdCreative

# Init
APP_ID = os.environ.get("META_APP_ID", "1530004145468079")
APP_SECRET = os.environ.get("META_APP_SECRET")
ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN")
AD_ACCOUNT_ID = os.environ.get("META_AD_ACCOUNT_ID", "act_501575229632826")
PAGE_ID = os.environ.get("META_PAGE_ID", "")

mcp = FastMCP("meta-ads")


def get_api():
    FacebookAdsApi.init(APP_ID, APP_SECRET, ACCESS_TOKEN)
    return AdAccount(AD_ACCOUNT_ID)


# ─── ИНСАЙТИ ────────────────────────────────────────────────────────────────

@mcp.tool()
def get_campaigns(days: int = 7) -> str:
    """Покажи всички кампании с резултати за последните N дни."""
    account = get_api()
    campaigns = account.get_campaigns(fields=[
        Campaign.Field.id,
        Campaign.Field.name,
        Campaign.Field.status,
        Campaign.Field.objective,
        Campaign.Field.daily_budget,
        Campaign.Field.lifetime_budget,
    ])
    result = []
    for c in campaigns:
        result.append({
            "id": c.get("id"),
            "name": c.get("name"),
            "status": c.get("status"),
            "objective": c.get("objective"),
            "daily_budget": c.get("daily_budget"),
        })
    return json.dumps(result, ensure_ascii=False, indent=2)


@mcp.tool()
def get_insights(campaign_id: str = None, days: int = 7) -> str:
    """Вземи метрики (reach, impressions, clicks, CPC, CPM, spend) за кампания или целия акаунт."""
    account = get_api()
    params = {
        "date_preset": f"last_{days}_days",
        "level": "campaign",
    }
    fields = ["campaign_name", "reach", "impressions", "clicks", "spend", "cpc", "cpm", "ctr", "actions"]
    if campaign_id:
        from facebook_business.adobjects.campaign import Campaign
        obj = Campaign(campaign_id)
        insights = obj.get_insights(fields=fields, params={"date_preset": f"last_{days}_days"})
    else:
        insights = account.get_insights(fields=fields, params=params)
    result = [dict(i) for i in insights]
    return json.dumps(result, ensure_ascii=False, indent=2)


# ─── СЪЗДАВАНЕ ──────────────────────────────────────────────────────────────

@mcp.tool()
def create_campaign(name: str, objective: str = "OUTCOME_TRAFFIC", daily_budget_eur: float = 5.0) -> str:
    """
    Създай нова кампания.
    objective: OUTCOME_TRAFFIC | OUTCOME_LEADS | OUTCOME_AWARENESS | OUTCOME_SALES
    daily_budget_eur: дневен бюджет в евро
    """
    account = get_api()
    campaign = account.create_campaign(fields=[], params={
        Campaign.Field.name: name,
        Campaign.Field.objective: objective,
        Campaign.Field.status: Campaign.Status.paused,
        Campaign.Field.special_ad_categories: [],
        Campaign.Field.daily_budget: int(daily_budget_eur * 100),  # в стотинки
    })
    return json.dumps({"id": campaign["id"], "name": name, "status": "PAUSED"}, ensure_ascii=False)


@mcp.tool()
def create_ad_set(
    campaign_id: str,
    name: str,
    daily_budget_eur: float = 5.0,
    age_min: int = 22,
    age_max: int = 55,
    genders: list = None,
    interests: list = None,
    cities: list = None,
    optimization_goal: str = "LINK_CLICKS",
    billing_event: str = "IMPRESSIONS",
) -> str:
    """
    Създай Ad Set с таргетинг.
    genders: [1] = мъже, [2] = жени, [1,2] = всички
    interests: списък с interest ID-та или имена
    cities: ['Sofia', 'Plovdiv', ...]
    optimization_goal: LINK_CLICKS | IMPRESSIONS | REACH | LEAD_GENERATION
    """
    account = get_api()

    targeting = {
        "age_min": age_min,
        "age_max": age_max,
        "geo_locations": {
            "countries": ["BG"],
            **({"cities": [{"name": c, "region": "Sofia-City", "country": "BG"} for c in (cities or [])]} if cities else {}),
        },
    }
    if genders:
        targeting["genders"] = genders
    if interests:
        targeting["flexible_spec"] = [{"interests": [{"id": i} if str(i).isdigit() else {"name": i} for i in interests]}]

    ad_set = account.create_ad_set(fields=[], params={
        AdSet.Field.name: name,
        AdSet.Field.campaign_id: campaign_id,
        AdSet.Field.daily_budget: int(daily_budget_eur * 100),
        AdSet.Field.billing_event: billing_event,
        AdSet.Field.optimization_goal: optimization_goal,
        AdSet.Field.bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        AdSet.Field.targeting: targeting,
        AdSet.Field.status: AdSet.Status.paused,
    })
    return json.dumps({"id": ad_set["id"], "name": name}, ensure_ascii=False)


@mcp.tool()
def create_ad(
    ad_set_id: str,
    name: str,
    title: str,
    body: str,
    link_url: str,
    image_url: str = None,
    call_to_action: str = "LEARN_MORE",
) -> str:
    """
    Създай реклама с текст и линк.
    call_to_action: LEARN_MORE | SIGN_UP | BOOK_TRAVEL | GET_QUOTE | CONTACT_US
    image_url: URL на изображение (трябва да е публично достъпно)
    """
    account = get_api()

    creative_params = {
        AdCreative.Field.name: f"{name} Creative",
        AdCreative.Field.object_story_spec: {
            "page_id": PAGE_ID,
            "link_data": {
                "message": body,
                "name": title,
                "link": link_url,
                "call_to_action": {"type": call_to_action},
                **({"picture": image_url} if image_url else {}),
            },
        },
    }
    creative = account.create_ad_creative(fields=[], params=creative_params)

    ad = account.create_ad(fields=[], params={
        Ad.Field.name: name,
        Ad.Field.adset_id: ad_set_id,
        Ad.Field.creative: {"creative_id": creative["id"]},
        Ad.Field.status: Ad.Status.paused,
    })
    return json.dumps({"ad_id": ad["id"], "creative_id": creative["id"], "name": name}, ensure_ascii=False)


# ─── УПРАВЛЕНИЕ ──────────────────────────────────────────────────────────────

@mcp.tool()
def pause_campaign(campaign_id: str) -> str:
    """Паузирай кампания."""
    campaign = Campaign(campaign_id)
    campaign.api_update(params={Campaign.Field.status: Campaign.Status.paused})
    return f"Кампания {campaign_id} е паузирана."


@mcp.tool()
def resume_campaign(campaign_id: str) -> str:
    """Активирай паузирана кампания."""
    campaign = Campaign(campaign_id)
    campaign.api_update(params={Campaign.Field.status: Campaign.Status.active})
    return f"Кампания {campaign_id} е активирана."


@mcp.tool()
def update_budget(campaign_id: str, daily_budget_eur: float) -> str:
    """Промени дневния бюджет на кампания (в евро)."""
    campaign = Campaign(campaign_id)
    campaign.api_update(params={Campaign.Field.daily_budget: int(daily_budget_eur * 100)})
    return f"Бюджетът на кампания {campaign_id} е променен на €{daily_budget_eur}/ден."


@mcp.tool()
def delete_campaign(campaign_id: str) -> str:
    """Изтрий кампания."""
    campaign = Campaign(campaign_id)
    campaign.api_delete()
    return f"Кампания {campaign_id} е изтрита."


if __name__ == "__main__":
    mcp.run(transport="stdio")
