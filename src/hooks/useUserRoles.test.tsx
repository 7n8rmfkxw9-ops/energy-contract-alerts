import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUserRoles } from "./useUserRoles";

const { mockUseAuth, mockRolesData } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockRolesData: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: mockRolesData() }),
      }),
    }),
  },
}));

describe("useUserRoles", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockRolesData.mockReset();
  });

  it("returns empty roles immediately when there is no user", async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useUserRoles());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.roles).toEqual([]);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isPro).toBe(false);
  });

  it("derives isAdmin only when admin role is present", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" } });
    mockRolesData.mockReturnValue([{ role: "admin" }]);
    const { result } = renderHook(() => useUserRoles());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isProducer).toBe(false);
    // admin is not in the "pro" allow-list (producteur/torrefacteur/shop)
    expect(result.current.isPro).toBe(false);
  });

  it.each([
    ["producteur", "isProducer"],
    ["torrefacteur", "isRoaster"],
    ["shop", "isShop"],
  ] as const)("treats %s as a pro role and sets %s", async (role, flag) => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" } });
    mockRolesData.mockReturnValue([{ role }]);
    const { result } = renderHook(() => useUserRoles());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isPro).toBe(true);
    expect(result.current[flag]).toBe(true);
  });

  it("treats barista as not a pro role", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" } });
    mockRolesData.mockReturnValue([{ role: "barista" }]);
    const { result } = renderHook(() => useUserRoles());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isBarista).toBe(true);
    expect(result.current.isPro).toBe(false);
  });

  it("supports multiple simultaneous roles", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" } });
    mockRolesData.mockReturnValue([{ role: "shop" }, { role: "barista" }]);
    const { result } = renderHook(() => useUserRoles());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.roles).toEqual(["shop", "barista"]);
    expect(result.current.isShop).toBe(true);
    expect(result.current.isBarista).toBe(true);
    expect(result.current.isPro).toBe(true);
  });

  it("treats null data from supabase as no roles", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" } });
    mockRolesData.mockReturnValue(null);
    const { result } = renderHook(() => useUserRoles());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.roles).toEqual([]);
  });
});
