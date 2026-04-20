import type {
  ApiResponse,
  OrgMetrics,
  TimeseriesData,
  RankingItem,
  RankingType,
  ApiParams,
  ActivitiesParams,
  MemberActivitiesResponse,
  DoraParams,
  DoraResponse,
  AiUsageParams,
  AiUsageResponse,
  ReleaseCasesParams,
  ReleaseCasesResponse,
} from "../types/api";

const API_BASE = "/api/v1";

const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (key === "repo" && Array.isArray(value)) {
      value.forEach((repo) => searchParams.append("repo", repo));
    } else if (key === "repo" && typeof value === "string") {
      searchParams.append("repo", value);
    } else {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
};

export const apiClient = {
  async getOrgMetrics(
    org: string,
    params: ApiParams = {}
  ): Promise<ApiResponse<OrgMetrics>> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/metrics${query ? `?${query}` : ""}`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch org metrics: ${res.statusText}`);
    return res.json();
  },

  async getTimeseries(
    org: string,
    params: ApiParams = {}
  ): Promise<ApiResponse<TimeseriesData[]>> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/metrics/timeseries${
      query ? `?${query}` : ""
    }`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch timeseries: ${res.statusText}`);
    return res.json();
  },

  async getMemberRanking(
    org: string,
    type: RankingType,
    params: ApiParams = {}
  ): Promise<ApiResponse<RankingItem[]>> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/rankings/members/${type}${
      query ? `?${query}` : ""
    }`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch member ranking: ${res.statusText}`);
    return res.json();
  },

  async getRepoRanking(
    org: string,
    type: RankingType,
    params: ApiParams = {}
  ): Promise<ApiResponse<RankingItem[]>> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/rankings/repos/${type}${
      query ? `?${query}` : ""
    }`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch repo ranking: ${res.statusText}`);
    return res.json();
  },

  async getRepoMetrics(
    org: string,
    repo: string,
    params: ApiParams = {}
  ): Promise<ApiResponse<OrgMetrics>> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/repos/${repo}/metrics${
      query ? `?${query}` : ""
    }`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch repo metrics: ${res.statusText}`);
    return res.json();
  },

  async getRepoTimeseries(
    org: string,
    repo: string,
    params: ApiParams = {}
  ): Promise<ApiResponse<any>> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/repos/${repo}/metrics/timeseries${
      query ? `?${query}` : ""
    }`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch repo timeseries: ${res.statusText}`);
    return res.json();
  },

  async getDetailedTimeseries(
    org: string,
    params: ApiParams = {}
  ): Promise<ApiResponse<any>> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/metrics/timeseries/detailed${
      query ? `?${query}` : ""
    }`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch detailed timeseries: ${res.statusText}`);
    return res.json();
  },

  async getOrgDora(org: string, params: DoraParams = {}): Promise<DoraResponse> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/dora${query ? `?${query}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch DORA: ${res.statusText}`);
    return res.json();
  },

  async getRepoDora(
    org: string,
    repo: string,
    params: Omit<DoraParams, "repo"> = {}
  ): Promise<DoraResponse> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/repos/${encodeURIComponent(
      repo
    )}/dora${query ? `?${query}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch repo DORA: ${res.statusText}`);
    return res.json();
  },

  async getMemberDora(
    org: string,
    member: string,
    params: DoraParams = {}
  ): Promise<DoraResponse> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/members/${encodeURIComponent(
      member
    )}/dora${query ? `?${query}` : ""}`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch member DORA: ${res.statusText}`);
    return res.json();
  },

  async getOrgAIUsage(
    org: string,
    params: AiUsageParams = {}
  ): Promise<AiUsageResponse> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/ai-usage${query ? `?${query}` : ""}`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch AI usage: ${res.statusText}`);
    return res.json();
  },

  async getMemberAIUsage(
    org: string,
    member: string,
    params: AiUsageParams = {}
  ): Promise<AiUsageResponse> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/members/${encodeURIComponent(
      member
    )}/ai-usage${query ? `?${query}` : ""}`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch member AI usage: ${res.statusText}`);
    return res.json();
  },

  async getReleaseCases(
    org: string,
    params: ReleaseCasesParams = {}
  ): Promise<ReleaseCasesResponse> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/release-cases${
      query ? `?${query}` : ""
    }`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch release cases: ${res.statusText}`);
    return res.json();
  },

  async getMemberActivities(
    org: string,
    member: string,
    params: ActivitiesParams = {}
  ): Promise<MemberActivitiesResponse> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/members/${encodeURIComponent(
      member
    )}/activities${query ? `?${query}` : ""}`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch member activities: ${res.statusText}`);
    return res.json();
  },

  async getRepoMembersMetrics(
    org: string,
    repo: string,
    params: ApiParams = {}
  ): Promise<ApiResponse<RankingItem[]>> {
    const query = buildQueryString(params);
    const url = `${API_BASE}/orgs/${org}/repos/${repo}/members/metrics${
      query ? `?${query}` : ""
    }`;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(
        `Failed to fetch repo members metrics: ${res.statusText}`
      );
    return res.json();
  },
};
