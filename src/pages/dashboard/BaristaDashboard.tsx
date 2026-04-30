import { DashLayout } from "@/components/dashboard/DashLayout";
import { RoleGate } from "@/components/RoleGate";

const NAV = [
  { to: "/dashboard/barista", label: "Mon espace" },
  { to: "/dashboard/messages", label: "Messages" },
];

const Inner = () => (
  <DashLayout
    title="Espace barista"
    subtitle="Bientôt : carnet de cuppings, échanges avec votre torréfacteur, ressources techniques."
    nav={NAV}
  >
    <div className="border border-dashed border-border rounded-md p-10 max-w-2xl">
      <p className="text-muted-foreground">
        Votre espace évolue. En attendant, accédez à la messagerie pour échanger avec les producteurs et coffee shops du réseau.
      </p>
    </div>
  </DashLayout>
);

const BaristaDashboard = () => (
  <RoleGate allow={["barista"]}>
    <Inner />
  </RoleGate>
);
export default BaristaDashboard;
