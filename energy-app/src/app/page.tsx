import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Energy Contract Alerts</h1>
      <p className="mt-2 text-slate-600">
        Suivi de consommation par relevés d&apos;index (compteur analogique)
        et comparaison de contrats d&apos;énergie sur ton profil réel.
      </p>

      <ul className="mt-6 space-y-2">
        <li>
          <Link href="/readings" className="underline">
            Relevés de compteur
          </Link>{" "}
          — saisie des index, historique, conso par période.
        </li>
        <li className="text-slate-400">
          Base de tarifs, comparateur, alertes et dashboard : modules à
          venir.
        </li>
      </ul>
    </main>
  );
}
