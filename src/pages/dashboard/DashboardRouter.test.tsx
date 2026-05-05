import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DashboardRouter from "./DashboardRouter";

const { mockUseAuth, mockUseUserRoles } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseUserRoles: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: mockUseAuth }));
vi.mock("@/hooks/useUserRoles", () => ({ useUserRoles: mockUseUserRoles }));

const renderRouter = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<DashboardRouter />} />
        <Route path="/auth" element={<div>auth-page</div>} />
        <Route path="/admin" element={<div>admin-page</div>} />
        <Route path="/dashboard/producer" element={<div>producer-page</div>} />
        <Route path="/dashboard/buyer" element={<div>buyer-page</div>} />
        <Route path="/dashboard/barista" element={<div>barista-page</div>} />
        <Route path="/verification" element={<div>verification-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseUserRoles.mockReset();
});

describe("DashboardRouter", () => {
  it("shows a loader while auth or roles are loading", () => {
    mockUseAuth.mockReturnValue({ session: null, loading: true });
    mockUseUserRoles.mockReturnValue({ roles: [], loading: false });
    const { container } = renderRouter();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("redirects to /auth when there is no session", () => {
    mockUseAuth.mockReturnValue({ session: null, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: [], loading: false });
    renderRouter();
    expect(screen.getByText("auth-page")).toBeTruthy();
  });

  it("admin takes precedence over producteur", () => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: ["admin", "producteur"], loading: false });
    renderRouter();
    expect(screen.getByText("admin-page")).toBeTruthy();
  });

  it("producteur routes to /dashboard/producer", () => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: ["producteur"], loading: false });
    renderRouter();
    expect(screen.getByText("producer-page")).toBeTruthy();
  });

  it("producteur takes precedence over shop", () => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: ["producteur", "shop"], loading: false });
    renderRouter();
    expect(screen.getByText("producer-page")).toBeTruthy();
  });

  it.each(["shop", "torrefacteur"] as const)("%s routes to /dashboard/buyer", (role) => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: [role], loading: false });
    renderRouter();
    expect(screen.getByText("buyer-page")).toBeTruthy();
  });

  it("barista routes to /dashboard/barista when no buyer role is present", () => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: ["barista"], loading: false });
    renderRouter();
    expect(screen.getByText("barista-page")).toBeTruthy();
  });

  it("buyer roles take precedence over barista", () => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: ["shop", "barista"], loading: false });
    renderRouter();
    expect(screen.getByText("buyer-page")).toBeTruthy();
  });

  it("a session with no role lands on /verification", () => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: [], loading: false });
    renderRouter();
    expect(screen.getByText("verification-page")).toBeTruthy();
  });
});
