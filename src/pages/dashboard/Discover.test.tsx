import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Discover from "./Discover";
import { makeChain, channelStub } from "@/test/supabase-mock";

const { mockUseAuth, mockUseUserRoles, mockFrom, mockRpc, mockInvoke } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseUserRoles: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockInvoke: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: mockUseAuth }));
vi.mock("@/hooks/useUserRoles", () => ({ useUserRoles: mockUseUserRoles }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    channel: () => channelStub(),
    removeChannel: vi.fn(),
  },
}));

const renderDiscover = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/buyer/discover"]}>
      <Discover />
    </MemoryRouter>,
  );

const lot = (id: string, name: string, score?: number) => ({
  id,
  name,
  variety: "Heirloom",
  process: "natural",
  flavor_notes: ["cassis"],
  sca_score: 86,
  price_per_kg: 12,
  currency: "EUR",
  volume_kg: 30,
  status: "available",
  producer_id: `p-${id}`,
  photo_url: null,
  created_at: "2026-01-01",
  __score: score, // not used by component, just for our test sorting expectations
});

const producerRow = (id: string, country: string) => ({
  id,
  full_name: `Producer ${id}`,
  company: `Farm ${id}`,
  country,
});

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseUserRoles.mockReset();
  mockFrom.mockReset();
  mockRpc.mockReset();
  mockInvoke.mockReset();

  mockUseAuth.mockReturnValue({ session: { user: { id: "u1" } }, user: { id: "u1" }, loading: false });
  mockUseUserRoles.mockReturnValue({ roles: ["shop"], loading: false });
});

describe("Discover", () => {
  it("renders the empty state when no lots are available", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "coffee_lots") return makeChain({ data: [], error: null });
      if (table === "lot_favorites") return makeChain({ data: [], error: null });
      return makeChain({ data: [], error: null });
    });

    renderDiscover();

    await waitFor(() =>
      expect(screen.getByText(/Aucun lot disponible/)).toBeInTheDocument(),
    );
  });

  it("renders lot cards once lots and verified producers are hydrated", async () => {
    const lots = [lot("a", "Sidamo Natural"), lot("b", "Yirgacheffe Washed")];
    mockFrom.mockImplementation((table: string) => {
      if (table === "coffee_lots") return makeChain({ data: lots, error: null });
      if (table === "lot_favorites") return makeChain({ data: [], error: null });
      return makeChain({ data: [], error: null });
    });
    mockRpc.mockImplementation((_fn: string, args: { profile_id: string }) =>
      Promise.resolve({
        data: [producerRow(args.profile_id, "Éthiopie")],
        error: null,
      }),
    );

    renderDiscover();

    await waitFor(() => {
      expect(screen.getByText("Sidamo Natural")).toBeInTheDocument();
      expect(screen.getByText("Yirgacheffe Washed")).toBeInTheDocument();
    });
  });

  it("filters out lots whose producer is not verified (rpc returns empty)", async () => {
    const lots = [lot("a", "Hidden Lot"), lot("b", "Visible Lot")];
    mockFrom.mockImplementation((table: string) => {
      if (table === "coffee_lots") return makeChain({ data: lots, error: null });
      if (table === "lot_favorites") return makeChain({ data: [], error: null });
      return makeChain({ data: [], error: null });
    });
    mockRpc.mockImplementation((_fn: string, args: { profile_id: string }) => {
      // Only "p-b" is verified
      if (args.profile_id === "p-b") {
        return Promise.resolve({ data: [producerRow("p-b", "Colombie")], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    renderDiscover();

    await waitFor(() => expect(screen.getByText("Visible Lot")).toBeInTheDocument());
    expect(screen.queryByText("Hidden Lot")).not.toBeInTheDocument();
  });

  it("re-orders lots by match score when the agent button is clicked", async () => {
    const lots = [lot("low", "Low Match"), lot("high", "High Match")];
    mockFrom.mockImplementation((table: string) => {
      if (table === "coffee_lots") return makeChain({ data: lots, error: null });
      if (table === "lot_favorites") return makeChain({ data: [], error: null });
      return makeChain({ data: [], error: null });
    });
    mockRpc.mockImplementation((_fn: string, args: { profile_id: string }) =>
      Promise.resolve({ data: [producerRow(args.profile_id, "Éthiopie")], error: null }),
    );
    mockInvoke.mockResolvedValue({
      data: {
        matches: [
          { lot_id: "high", score: 92, why: "match parfait" },
          { lot_id: "low", score: 30, why: "" },
        ],
      },
      error: null,
    });

    renderDiscover();

    await waitFor(() => expect(screen.getByText("High Match")).toBeInTheDocument());

    // Initially "Low Match" appears before "High Match" (insertion order)
    let cards = screen.getAllByRole("article");
    expect(cards[0]).toHaveTextContent("Low Match");

    fireEvent.click(screen.getByRole("button", { name: /Demander à l'agent Terra/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("match-lots", { body: {} });
      cards = screen.getAllByRole("article");
      expect(cards[0]).toHaveTextContent("High Match");
      expect(screen.getByText("92% match")).toBeInTheDocument();
    });
  });
});
