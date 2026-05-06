import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConversationView from "./ConversationView";
import { makeChain, channelStub } from "@/test/supabase-mock";

const { mockUseAuth, mockUseUserRoles, mockFrom, mockRpc, mockInvoke, mockInsert, mockUpdate } =
  vi.hoisted(() => ({
    mockUseAuth: vi.fn(),
    mockUseUserRoles: vi.fn(),
    mockFrom: vi.fn(),
    mockRpc: vi.fn(),
    mockInvoke: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
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

const renderConv = (id = "c1") =>
  render(
    <MemoryRouter initialEntries={[`/dashboard/messages/${id}`]}>
      <Routes>
        <Route path="/dashboard/messages/:id" element={<ConversationView />} />
        <Route path="/dashboard/messages" element={<div>messages-list</div>} />
      </Routes>
    </MemoryRouter>,
  );

const message = (id: string, sender: string, body: string, extras: Record<string, unknown> = {}) => ({
  id,
  conversation_id: "c1",
  sender_id: sender,
  body,
  source_lang: "fr",
  translated_body: null,
  translated_lang: null,
  read_at: null,
  created_at: "2026-01-01T10:00:00Z",
  ...extras,
});

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseUserRoles.mockReset();
  mockFrom.mockReset();
  mockRpc.mockReset();
  mockInvoke.mockReset();
  mockInsert.mockReset();
  mockUpdate.mockReset();

  mockUseAuth.mockReturnValue({ session: { user: { id: "u1" } }, user: { id: "u1" }, loading: false });
  mockUseUserRoles.mockReturnValue({ roles: ["shop"], loading: false, isProducer: false });
});

describe("ConversationView", () => {
  it("renders the messages once loaded", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "conversations") {
        return makeChain({
          data: { id: "c1", lot_id: "l1", buyer_id: "u1", producer_id: "u2" },
          error: null,
        });
      }
      if (table === "coffee_lots") {
        return makeChain({ data: { name: "Sidamo" }, error: null });
      }
      if (table === "messages") {
        return makeChain({
          data: [
            message("m1", "u2", "Bonjour, voici notre lot."),
            message("m2", "u1", "Merci, on regarde."),
          ],
          error: null,
        });
      }
      return makeChain({ data: null, error: null });
    });
    mockRpc.mockResolvedValue({ data: [{ company: "Farm X", full_name: "Alice" }], error: null });

    renderConv();

    await waitFor(() => {
      expect(screen.getByText("Bonjour, voici notre lot.")).toBeInTheDocument();
      expect(screen.getByText("Merci, on regarde.")).toBeInTheDocument();
    });
    expect(screen.getByText(/Sidamo/)).toBeInTheDocument();
  });

  it("redirects to the messages list when the conversation does not exist", async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));
    mockRpc.mockResolvedValue({ data: [], error: null });

    renderConv("missing");

    await waitFor(() => expect(screen.getByText("messages-list")).toBeInTheDocument());
  });

  it("inserts a new message when the form is submitted", async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "conversations") {
        return makeChain({
          data: { id: "c1", lot_id: "l1", buyer_id: "u1", producer_id: "u2" },
          error: null,
        });
      }
      if (table === "coffee_lots") return makeChain({ data: { name: "Sidamo" }, error: null });
      if (table === "messages") {
        // Initial select returns no messages; insert is captured on the spy.
        return {
          select: () => ({
            eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
          }),
          insert: insertSpy,
          update: () => ({ in: () => Promise.resolve({ error: null }) }),
        } as unknown as ReturnType<typeof makeChain>;
      }
      return makeChain({ data: null, error: null });
    });
    mockRpc.mockResolvedValue({ data: [{ company: "Farm X" }], error: null });

    renderConv();

    const textarea = await screen.findByPlaceholderText(/Écrivez votre message/);
    fireEvent.change(textarea, { target: { value: "Hello world" } });
    fireEvent.submit(textarea.closest("form")!);

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    const [[payload]] = insertSpy.mock.calls;
    expect(payload[0]).toMatchObject({
      conversation_id: "c1",
      sender_id: "u1",
      body: "Hello world",
    });
  });

  it("requests a translation when 'Traduire' is clicked on a peer message", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "conversations") {
        return makeChain({
          data: { id: "c1", lot_id: "l1", buyer_id: "u1", producer_id: "u2" },
          error: null,
        });
      }
      if (table === "coffee_lots") return makeChain({ data: { name: "Sidamo" }, error: null });
      if (table === "messages") {
        return makeChain({
          data: [message("m1", "u2", "Hallo, hier ist unser Lot.", { source_lang: "de" })],
          error: null,
        });
      }
      return makeChain({ data: null, error: null });
    });
    mockRpc.mockResolvedValue({ data: [{ company: "Farm X" }], error: null });
    mockInvoke.mockResolvedValue({
      data: { translated_body: "Bonjour, voici notre lot.", translated_lang: "fr" },
      error: null,
    });

    renderConv();

    const button = await screen.findByRole("button", { name: /Traduire/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "translate-message",
        expect.objectContaining({
          body: expect.objectContaining({ message_id: "m1" }),
        }),
      );
      expect(screen.getByText("Bonjour, voici notre lot.")).toBeInTheDocument();
    });
  });
});
