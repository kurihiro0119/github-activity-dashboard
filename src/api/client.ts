import type {
  ApiResponse,
  OrgMetrics,
  TimeseriesData,
  RankingItem,
  RankingType,
  ApiParams,
} from "../types/api";

const API_BASE = "/api/v1";

const buildQueryString = (params: ApiParams): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === "repo" && Array.isArray(value)) {
        // 複数のリポジトリを複数のrepoパラメータとして追加
        value.forEach((repo) => searchParams.append("repo", repo));
      } else if (key === "repo" && typeof value === "string") {
        searchParams.append("repo", value);
      } else {
        searchParams.append(key, String(value));
      }
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
    console.log("API Request URL:", url);
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
    console.log("API Request URL:", url);
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
