import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReactNode } from "react";
import { AuthGate, RoleGate } from "./RoleGate";

const { mockUseAuth, mockUseUserRoles } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseUserRoles: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: mockUseAuth }));
vi.mock("@/hooks/useUserRoles", () => ({ useUserRoles: mockUseUserRoles }));

const renderAt = (ui: ReactNode) =>
  render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/auth" element={<div>auth-page</div>} />
        <Route path="/dashboard" element={<div>dashboard-home</div>} />
        <Route path="/protected" element={<>{ui}</>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseUserRoles.mockReset();
});

describe("RoleGate", () => {
  it("shows a loader while auth is loading", () => {
    mockUseAuth.mockReturnValue({ session: null, loading: true });
    mockUseUserRoles.mockReturnValue({ roles: [], loading: false });
    const { container } = renderAt(<RoleGate allow={["admin"]}><div>secret</div></RoleGate>);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("shows a loader while roles are loading", () => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: [], loading: true });
    const { container } = renderAt(<RoleGate allow={["admin"]}><div>secret</div></RoleGate>);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("redirects to /auth when there is no session", () => {
    mockUseAuth.mockReturnValue({ session: null, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: [], loading: false });
    renderAt(<RoleGate allow={["admin"]}><div>secret</div></RoleGate>);
    expect(screen.getByText("auth-page")).toBeTruthy();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("redirects to /dashboard when the user has no allowed role", () => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: ["barista"], loading: false });
    renderAt(<RoleGate allow={["admin"]}><div>secret</div></RoleGate>);
    expect(screen.getByText("dashboard-home")).toBeTruthy();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("renders children when a role intersects the allow-list", () => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: ["admin", "barista"], loading: false });
    renderAt(<RoleGate allow={["admin", "producteur"]}><div>secret</div></RoleGate>);
    expect(screen.getByText("secret")).toBeTruthy();
  });
});

describe("AuthGate", () => {
  it("shows a loader while auth is loading", () => {
    mockUseAuth.mockReturnValue({ session: null, loading: true });
    mockUseUserRoles.mockReturnValue({ roles: [], loading: false });
    const { container } = renderAt(<AuthGate><div>private</div></AuthGate>);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("redirects to /auth when there is no session", () => {
    mockUseAuth.mockReturnValue({ session: null, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: [], loading: false });
    renderAt(<AuthGate><div>private</div></AuthGate>);
    expect(screen.getByText("auth-page")).toBeTruthy();
  });

  it("renders children when a session exists, regardless of roles", () => {
    mockUseAuth.mockReturnValue({ session: { user: {} }, loading: false });
    mockUseUserRoles.mockReturnValue({ roles: [], loading: false });
    renderAt(<AuthGate><div>private</div></AuthGate>);
    expect(screen.getByText("private")).toBeTruthy();
  });
});
