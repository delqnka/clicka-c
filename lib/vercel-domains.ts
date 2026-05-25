import { VERCEL_SHARED_CNAME, getPlatformSiteHost } from '@/lib/domain-routing';

type VercelDomainConfig = {
  configuredBy?: string | null;
  acceptedChallenges?: string[];
  misconfigured?: boolean;
  recommendedIPv4?: Array<{ rank?: number; value?: string[] | string }>;
  recommendedCNAME?: Array<{ rank?: number; value?: string }>;
};

type VercelProjectDomain = {
  name?: string;
  apexName?: string;
  verified?: boolean;
  verification?: Array<{
    type?: string;
    domain?: string;
    value?: string;
    reason?: string;
  }>;
};

type VercelApiContext = {
  token: string | null;
  projectId: string | null;
  teamId: string | null;
};

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getVercelApiContext(): VercelApiContext {
  return {
    token: process.env.VERCEL_API_TOKEN ?? null,
    projectId: process.env.VERCEL_PROJECT_ID ?? null,
    teamId: process.env.VERCEL_TEAM_ID ?? null,
  };
}

function buildQuery(teamId: string | null) {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
}

function buildHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function fetchVercelJson(
  path: string,
  init: RequestInit,
  context: VercelApiContext
) {
  if (!context.token) {
    return { ok: false, status: 0, json: null };
  }

  const response = await fetch(`https://api.vercel.com${path}${buildQuery(context.teamId)}`, {
    ...init,
    headers: {
      ...buildHeaders(context.token),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  return {
    ok: response.ok,
    status: response.status,
    json: await safeJson(response),
  };
}

function getRelativeHost(domain: string, apexName?: string | null) {
  const apex = String(apexName ?? '').trim();
  if (!apex || domain === apex) return '@';
  if (domain.endsWith(`.${apex}`)) {
    return domain.slice(0, -1 * (`.${apex}`).length);
  }
  return domain;
}

export function buildDnsInstructions(
  domain: string,
  options?: {
    config?: VercelDomainConfig | null;
    projectDomain?: VercelProjectDomain | null;
  }
) {
  const config = options?.config ?? null;
  const projectDomain = options?.projectDomain ?? null;
  const apexName = String(projectDomain?.apexName ?? '').trim() || domain;
  const host = getRelativeHost(domain, apexName);
  const preferredCname =
    config?.recommendedCNAME
      ?.slice()
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0]
      ?.value || VERCEL_SHARED_CNAME;
  const preferredIPv4 =
    config?.recommendedIPv4
      ?.slice()
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0]
      ?.value;
  const ipv4Values = Array.isArray(preferredIPv4)
    ? preferredIPv4.filter(Boolean)
    : preferredIPv4
      ? [preferredIPv4]
      : ['76.76.21.21'];

  if (host !== '@') {
    return [
      {
        type: 'CNAME',
        host,
        value: preferredCname,
      },
    ];
  }

  return [
    ...ipv4Values.map(value => ({
      type: 'A',
      host: '@',
      value,
    })),
    {
      type: 'CNAME',
      host: 'www',
      value: preferredCname,
    },
  ];
}

export function extractVerificationInstructions(projectDomain?: VercelProjectDomain | null) {
  return Array.isArray(projectDomain?.verification)
    ? projectDomain!.verification
        .filter(item => item?.type && item?.domain && item?.value)
        .map(item => ({
          type: String(item.type),
          host: String(item.domain),
          value: String(item.value),
          reason: item.reason ? String(item.reason) : null,
        }))
    : [];
}

async function inspectProjectDomain(domain: string, context: VercelApiContext) {
  if (!context.projectId) return { ok: false, status: 0, json: null };
  return fetchVercelJson(
    `/v9/projects/${encodeURIComponent(context.projectId)}/domains/${encodeURIComponent(domain)}`,
    { method: 'GET' },
    context
  );
}

async function verifyProjectDomain(domain: string, context: VercelApiContext) {
  if (!context.projectId) return { ok: false, status: 0, json: null };

  const versions = ['v10', 'v9'];
  for (const version of versions) {
    const result = await fetchVercelJson(
      `/${version}/projects/${encodeURIComponent(context.projectId)}/domains/${encodeURIComponent(domain)}/verify`,
      { method: 'POST' },
      context
    );
    if (result.status !== 404) return result;
  }

  return { ok: false, status: 404, json: null };
}

async function getDomainConfig(domain: string, context: VercelApiContext) {
  return fetchVercelJson(
    `/v6/domains/${encodeURIComponent(domain)}/config`,
    { method: 'GET' },
    context
  );
}

function mapDomainStatus({
  addStatus,
  projectDomain,
  config,
}: {
  addStatus: number;
  projectDomain: VercelProjectDomain | null;
  config: VercelDomainConfig | null;
}) {
  const verified = projectDomain?.verified === true;
  const hasVerification = Array.isArray(projectDomain?.verification) && projectDomain!.verification!.length > 0;
  const misconfigured = config?.misconfigured === true;
  const configuredBy = String(config?.configuredBy ?? '').trim();

  if (verified && !misconfigured && configuredBy) return 'active';
  if (hasVerification && !verified) return 'pending_verification';
  if (!configuredBy || misconfigured) return 'pending_dns';
  if (verified) return 'active';
  if (addStatus >= 400 && addStatus !== 409) return 'error';
  return 'pending_dns';
}

export async function syncDomainWithVercel(domain: string) {
  const context = getVercelApiContext();

  if (!context.token || !context.projectId) {
    return {
      provider: 'manual' as const,
      status: 'pending_dns' as const,
      details: null,
      dnsInstructions: buildDnsInstructions(domain),
      verificationInstructions: [],
      configuredBy: null,
      misconfigured: null,
      verified: false,
    };
  }

  try {
    const add = await fetchVercelJson(
      `/v10/projects/${encodeURIComponent(context.projectId)}/domains`,
      {
        method: 'POST',
        body: JSON.stringify({ name: domain }),
      },
      context
    );

    // Also register www subdomain so www.domain.com routes to the same project
    const wwwDomain = `www.${domain}`;
    const isApex = !domain.startsWith('www.') && domain.split('.').length === 2;
    if (isApex) {
      await fetchVercelJson(
        `/v10/projects/${encodeURIComponent(context.projectId)}/domains`,
        { method: 'POST', body: JSON.stringify({ name: wwwDomain }) },
        context
      ).catch(() => {});
    }

    let inspect = await inspectProjectDomain(domain, context);
    let verify = null;

    if (inspect.ok && inspect.json && typeof inspect.json === 'object') {
      const projectDomain = inspect.json as VercelProjectDomain;
      if (projectDomain.verified === false) {
        verify = await verifyProjectDomain(domain, context);
        inspect = await inspectProjectDomain(domain, context);
      }
    }

    const config = await getDomainConfig(domain, context);
    const projectDomain =
      inspect.ok && inspect.json && typeof inspect.json === 'object'
        ? (inspect.json as VercelProjectDomain)
        : null;
    const domainConfig =
      config.ok && config.json && typeof config.json === 'object'
        ? (config.json as VercelDomainConfig)
        : null;
    const status = mapDomainStatus({
      addStatus: add.status,
      projectDomain,
      config: domainConfig,
    });
    const dnsInstructions = buildDnsInstructions(domain, {
      config: domainConfig,
      projectDomain,
    });
    const verificationInstructions = extractVerificationInstructions(projectDomain);

    return {
      provider: 'vercel' as const,
      status,
      details: {
        add: add.json,
        addStatus: add.status,
        inspect: inspect.json,
        inspectStatus: inspect.status,
        verify: verify?.json ?? null,
        verifyStatus: verify?.status ?? null,
        config: config.json,
        configStatus: config.status,
      },
      dnsInstructions,
      verificationInstructions,
      configuredBy: domainConfig?.configuredBy ?? null,
      misconfigured: domainConfig?.misconfigured ?? null,
      verified: projectDomain?.verified === true,
    };
  } catch (error) {
    return {
      provider: 'manual' as const,
      status: 'error' as const,
      details: {
        error: error instanceof Error ? error.message : 'Unknown domain sync error',
      },
      dnsInstructions: buildDnsInstructions(domain),
      verificationInstructions: [],
      configuredBy: null,
      misconfigured: null,
      verified: false,
    };
  }
}

export async function ensurePlatformSubdomain(slug: string) {
  return syncDomainWithVercel(getPlatformSiteHost(slug));
}

export async function removeProjectDomain(domain: string): Promise<{ ok: boolean }> {
  const context = getVercelApiContext();
  if (!context.token || !context.projectId) return { ok: true };

  const result = await fetchVercelJson(
    `/v9/projects/${encodeURIComponent(context.projectId)}/domains/${encodeURIComponent(domain)}`,
    { method: 'DELETE' },
    context
  );

  // Also remove www subdomain if this is an apex domain
  const isApex = !domain.startsWith('www.') && domain.split('.').length === 2;
  if (isApex) {
    await fetchVercelJson(
      `/v9/projects/${encodeURIComponent(context.projectId)}/domains/${encodeURIComponent(`www.${domain}`)}`,
      { method: 'DELETE' },
      context
    ).catch(() => {});
  }

  return { ok: result.ok || result.status === 404 };
}
