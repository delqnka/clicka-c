import { VERCEL_SHARED_CNAME, getPlatformSiteHost } from '@/lib/domain-routing';

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function buildDnsInstructions(domain: string) {
  const parts = domain.split('.');
  const subdomainLabel = parts.length > 2 ? parts[0] : null;

  if (subdomainLabel) {
    return [
      {
        type: 'CNAME',
        host: subdomainLabel,
        value: VERCEL_SHARED_CNAME,
      },
    ];
  }

  return [
    {
      type: 'A',
      host: '@',
      value: '76.76.21.21',
    },
    {
      type: 'CNAME',
      host: 'www',
      value: VERCEL_SHARED_CNAME,
    },
  ];
}

export async function syncDomainWithVercel(domain: string) {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return {
      provider: 'manual' as const,
      status: 'pending_dns' as const,
      details: null,
    };
  }

  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    const addRes = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains${query}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: domain }),
        cache: 'no-store',
      }
    );
    const addJson = await safeJson(addRes);

    const inspectRes = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}${query}`,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      }
    );
    const inspectJson = await safeJson(inspectRes);

    const providerStatus =
      inspectRes.ok && inspectJson && typeof inspectJson === 'object'
        ? String((inspectJson as Record<string, unknown>).verified ? 'active' : 'pending_dns')
        : addRes.ok || addRes.status === 409
          ? 'pending_dns'
          : 'pending_dns';

    return {
      provider: 'vercel' as const,
      status: providerStatus,
      details: {
        add: addJson,
        inspect: inspectJson,
        inspectStatus: inspectRes.status,
      },
    };
  } catch (error) {
    return {
      provider: 'manual' as const,
      status: 'pending_dns' as const,
      details: {
        error: error instanceof Error ? error.message : 'Unknown domain sync error',
      },
    };
  }
}

export async function ensurePlatformSubdomain(slug: string) {
  return syncDomainWithVercel(getPlatformSiteHost(slug));
}
