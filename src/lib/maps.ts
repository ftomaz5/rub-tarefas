// Monta o link do Google Maps para traçar a rota até o endereço do cliente.
//
// Decisões importantes:
// - Não informamos "origin" na URL. Isso faz o Google Maps (app ou navegador)
//   usar a localização atual do dispositivo como ponto de partida automaticamente.
//   É exatamente o que o entregador precisa: sair de onde ele estiver até o
//   próximo cliente, sem ter que voltar pra loja entre entregas.
// - Completamos o endereço com "Bandeirantes - PR" quando o funcionário não
//   digitou a cidade/estado. A maioria dos endereços cadastrados é só
//   "Rua, número, bairro", o que deixa o Google Maps sem contexto suficiente
//   pra encontrar o ponto certo (às vezes ele nem geolocaliza, só abre vazio).

const LOJA_CIDADE_ESTADO = "Bandeirantes - PR";

export function buildMapsUrl(clientAddress: string | null | undefined): string | null {
  const address = clientAddress?.trim();
  if (!address) return null;

  const jaTemCidade = address.toLowerCase().includes("bandeirantes");
  const enderecoCompleto = jaTemCidade
    ? address
    : `${address}, ${LOJA_CIDADE_ESTADO}`;

  const params = new URLSearchParams({
    api: "1",
    destination: enderecoCompleto,
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
