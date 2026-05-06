import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Auth from "./Auth";

const { mockUseAuth, mockSignIn, mockSignUp, mockToast } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockSignIn: vi.fn(),
  mockSignUp: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: mockUseAuth }));
vi.mock("@/hooks/use-toast", () => ({ toast: mockToast }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
    },
  },
}));

const renderAuth = () =>
  render(
    <MemoryRouter initialEntries={["/auth"]}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  mockUseAuth.mockReset();
  mockSignIn.mockReset();
  mockSignUp.mockReset();
  mockToast.mockReset();
  mockUseAuth.mockReturnValue({ session: null, loading: false });
  mockSignIn.mockResolvedValue({ error: null });
  mockSignUp.mockResolvedValue({ error: null });
});

describe("Auth page", () => {
  it("renders sign-in form by default", () => {
    renderAuth();
    expect(screen.getByPlaceholderText("votre@email.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /se connecter/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Nom complet")).not.toBeInTheDocument();
  });

  it("toggles to sign-up mode and reveals additional fields", () => {
    renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /créer un compte/i }));
    expect(screen.getByPlaceholderText("Nom complet")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Maison, ferme/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /créer mon compte/i })).toBeInTheDocument();
  });

  it("calls signInWithPassword with the typed credentials on submit", async () => {
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText("votre@email.com"), {
      target: { value: "alice@terra.coffee" },
    });
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "hunter22" },
    });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    expect(mockSignIn).toHaveBeenCalledWith({
      email: "alice@terra.coffee",
      password: "hunter22",
    });
  });

  it("calls signUp with role/full_name/company on submit", async () => {
    renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /créer un compte/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Coffee shop$/ }));
    fireEvent.change(screen.getByPlaceholderText("Nom complet"), {
      target: { value: "Bob Martin" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Maison, ferme/), {
      target: { value: "Café du Coin" },
    });
    fireEvent.change(screen.getByPlaceholderText("votre@email.com"), {
      target: { value: "bob@cafe.coffee" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mot de passe \(8/), {
      target: { value: "longenough" },
    });
    fireEvent.click(screen.getByRole("button", { name: /créer mon compte/i }));

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
    const arg = mockSignUp.mock.calls[0][0];
    expect(arg.email).toBe("bob@cafe.coffee");
    expect(arg.password).toBe("longenough");
    expect(arg.options.data).toMatchObject({
      full_name: "Bob Martin",
      company: "Café du Coin",
      role: "shop",
    });
  });

  it("shows a validation toast and skips supabase when sign-up data is invalid", async () => {
    renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /créer un compte/i }));
    // Whitespace-only fullName satisfies HTML `required` but fails Zod's
    // .trim().min(1). Password is 7 chars so it also fails the 8-char minimum.
    fireEvent.change(screen.getByPlaceholderText("Nom complet"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByPlaceholderText("votre@email.com"), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mot de passe \(8/), {
      target: { value: "short77" },
    });
    fireEvent.click(screen.getByRole("button", { name: /créer mon compte/i }));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("maps 'already registered' supabase error to a friendly French message", async () => {
    mockSignUp.mockResolvedValueOnce({ error: { message: "User already registered" } });
    renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /créer un compte/i }));
    fireEvent.change(screen.getByPlaceholderText("Nom complet"), { target: { value: "X" } });
    fireEvent.change(screen.getByPlaceholderText("votre@email.com"), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mot de passe \(8/), {
      target: { value: "longenough" },
    });
    fireEvent.click(screen.getByRole("button", { name: /créer mon compte/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Un compte existe déjà avec cet email.",
          variant: "destructive",
        }),
      ),
    );
  });

  it("maps 'Invalid login' supabase error to a friendly French message", async () => {
    mockSignIn.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText("votre@email.com"), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "whatever" },
    });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Email ou mot de passe incorrect.",
          variant: "destructive",
        }),
      ),
    );
  });

  it("redirects to / when the user is already authenticated", async () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: "u1" } },
      loading: false,
    });
    renderAuth();
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
  });
});
