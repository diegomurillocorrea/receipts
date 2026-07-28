"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DaiegoLogo } from "@/components/daiego-logo";
import {
  linkAccountToClientAction,
  searchClientsForHomeAction,
  searchReceiptsForHomeAction,
} from "./actions";
import { reassignPaymentReceiptAction } from "./payments/actions";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

const inputClassName =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30";

function getServiceImageUrl(service) {
  if (!service?.image_bucket || !service?.image_path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${service.image_bucket}/${service.image_path}`;
}

function getClientDisplayName(clients) {
  const client = Array.isArray(clients) ? clients[0] : clients;
  if (!client) return "Sin cliente";
  const fullName = [client.name, client.last_name].filter(Boolean).join(" ").trim();
  return fullName || "Sin cliente";
}

function getReceiptResultLabel(receipt) {
  const clientName = getClientDisplayName(receipt?.clients);
  const account = (receipt?.account_receipt_number ?? "").trim();
  if (!account) return clientName;
  return `${clientName} - ${account}`;
}

function ServicePlaceholder({ className = "h-full w-full" }) {
  return (
    <div
      className={`flex items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 ${className}`}
      aria-hidden
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}

function ServiceTile({ service }) {
  const imageUrl = getServiceImageUrl(service);
  const name = service.name?.trim() || "Servicio sin nombre";

  return (
    <li className="min-w-0">
      <Link
        href={`/${service.id}`}
        className="group flex w-full flex-col items-center gap-1.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        aria-label={`Buscar cuentas de ${name}`}
      >
        <div
          className="aspect-square w-full overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors duration-200 group-hover:border-emerald-500 group-focus-visible:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:group-hover:border-emerald-500"
          title={name}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-contain p-1.5"
              loading="lazy"
            />
          ) : (
            <ServicePlaceholder />
          )}
        </div>
        <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-snug text-zinc-700 transition-colors group-hover:text-emerald-700 dark:text-zinc-300 dark:group-hover:text-emerald-400 tablet:text-xs">
          {name}
        </span>
      </Link>
    </li>
  );
}

function SearchResultRow({
  receipt,
  serviceImageUrl,
  serviceName,
  isSelected,
  onSelect,
}) {
  const label = getReceiptResultLabel(receipt);
  const receiptService = Array.isArray(receipt.services)
    ? receipt.services[0]
    : receipt.services;
  const imageUrl =
    getServiceImageUrl(receiptService) || serviceImageUrl;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(receipt)}
        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${
          isSelected
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
            : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
        }`}
        aria-label={`Cuenta ${label}`}
        aria-pressed={isSelected}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={serviceName ? `Logo de ${serviceName}` : "Logo del servicio"}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <ServicePlaceholder className="h-full w-full" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {label}
        </span>
      </button>
    </li>
  );
}

function getClientFullName(client) {
  const fullName = [client?.name, client?.last_name].filter(Boolean).join(" ").trim();
  return fullName || "Sin nombre";
}

function ClientSearchResultRow({ client, isSelected, onSelect }) {
  const fullName = getClientFullName(client);
  const phone = (client?.phone_number ?? "").trim();
  const label = phone ? `${fullName} · ${phone}` : fullName;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(client)}
        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${
          isSelected
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
            : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
        }`}
        aria-label={`Vincular cuenta con ${label}`}
        aria-pressed={isSelected}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          aria-hidden
        >
          {(client?.name ?? "?").charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{fullName}</span>
          {phone ? (
            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
              {phone}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

function HomeSearchView({ service }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputId = useId();
  const clientSearchInputId = useId();
  const searchTimeoutRef = useRef(null);
  const clientSearchTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const clientInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  const [isReassigning, setIsReassigning] = useState(false);

  const [isLinkingClient, setIsLinkingClient] = useState(false);
  const [accountToLink, setAccountToLink] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientResults, setClientResults] = useState([]);
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [clientError, setClientError] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [isLinking, setIsLinking] = useState(false);

  const paymentId = (searchParams.get("paymentId") ?? "").trim();
  const isChangingPaymentClient = Boolean(paymentId);
  const serviceName = service.name?.trim() || "Servicio";
  const serviceImageUrl = getServiceImageUrl(service);
  const trimmedQuery = searchQuery.trim();
  const trimmedClientQuery = clientSearchQuery.trim();
  const canLinkMissingAccount =
    !isChangingPaymentClient &&
    !isLinkingClient &&
    trimmedQuery.length >= MIN_SEARCH_LENGTH &&
    !isLoading &&
    !error &&
    results.length === 0;

  const runSearch = useCallback(
    async (query) => {
      const q = (query ?? "").trim();
      if (q.length < MIN_SEARCH_LENGTH) {
        setResults([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      const result = await searchReceiptsForHomeAction(service.id, q);
      setIsLoading(false);

      if (result.error) {
        setResults([]);
        setError(result.error);
        return;
      }

      setResults(result.receipts ?? []);
    },
    [service.id]
  );

  const runClientSearch = useCallback(async (query) => {
    const q = (query ?? "").trim();
    if (q.length < MIN_SEARCH_LENGTH) {
      setClientResults([]);
      setClientError(null);
      setIsClientLoading(false);
      return;
    }

    setIsClientLoading(true);
    setClientError(null);
    const result = await searchClientsForHomeAction(q);
    setIsClientLoading(false);

    if (result.error) {
      setClientResults([]);
      setClientError(result.error);
      return;
    }

    setClientResults(result.clients ?? []);
  }, []);

  useEffect(() => {
    if (isLinkingClient) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(() => {
      runSearch(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, trimmedQuery.length, runSearch, isLinkingClient]);

  useEffect(() => {
    if (!isLinkingClient) return;
    if (clientSearchTimeoutRef.current) clearTimeout(clientSearchTimeoutRef.current);

    if (trimmedClientQuery.length < MIN_SEARCH_LENGTH) {
      setClientResults([]);
      setClientError(null);
      setIsClientLoading(false);
      return;
    }

    setIsClientLoading(true);
    clientSearchTimeoutRef.current = setTimeout(() => {
      runClientSearch(clientSearchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }
    };
  }, [
    clientSearchQuery,
    trimmedClientQuery.length,
    runClientSearch,
    isLinkingClient,
  ]);

  useEffect(() => {
    if (isLinkingClient) {
      clientInputRef.current?.focus();
      return;
    }
    inputRef.current?.focus();
  }, [isLinkingClient]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setSelectedReceiptId(null);
  };

  const handleClientSearchChange = (event) => {
    setClientSearchQuery(event.target.value);
    setSelectedClientId(null);
  };

  const handleStartLinkClient = () => {
    if (!canLinkMissingAccount) return;
    setAccountToLink(trimmedQuery);
    setIsLinkingClient(true);
    setClientSearchQuery("");
    setClientResults([]);
    setClientError(null);
    setSelectedClientId(null);
    setError(null);
  };

  const handleCancelLinkClient = () => {
    setIsLinkingClient(false);
    setAccountToLink("");
    setClientSearchQuery("");
    setClientResults([]);
    setClientError(null);
    setSelectedClientId(null);
    setIsLinking(false);
  };

  const handleSelectReceipt = async (receipt) => {
    const account = (receipt?.account_receipt_number ?? "").trim();
    if (!account || !receipt?.id || isReassigning) return;

    setSelectedReceiptId(receipt.id);

    if (!isChangingPaymentClient) {
      router.push(`/${service.id}/${encodeURIComponent(account)}`);
      return;
    }

    setIsReassigning(true);
    setError(null);
    const result = await reassignPaymentReceiptAction(paymentId, receipt.id);
    if (result.error) {
      setIsReassigning(false);
      setSelectedReceiptId(null);
      setError(result.error);
      return;
    }

    router.push(
      `/${service.id}/${encodeURIComponent(account)}?paymentId=${encodeURIComponent(paymentId)}`
    );
    router.refresh();
  };

  const handleSelectClient = async (client) => {
    if (!client?.id || !accountToLink || isLinking) return;

    setSelectedClientId(client.id);
    setIsLinking(true);
    setClientError(null);

    const result = await linkAccountToClientAction({
      clientId: client.id,
      serviceId: service.id,
      accountReceiptNumber: accountToLink,
    });

    if (result.error) {
      setIsLinking(false);
      setSelectedClientId(null);
      setClientError(result.error);
      return;
    }

    router.push(`/${service.id}/${encodeURIComponent(accountToLink)}`);
    router.refresh();
  };

  let resultsStatus = null;
  if (isLinkingClient) {
    if (isLinking) {
      resultsStatus = (
        <p
          className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
          role="status"
          aria-live="polite"
        >
          Vinculando cuenta…
        </p>
      );
    } else if (trimmedClientQuery.length < MIN_SEARCH_LENGTH) {
      resultsStatus = (
        <p
          className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
          role="status"
        >
          Escribe al menos {MIN_SEARCH_LENGTH} caracteres para buscar un cliente
        </p>
      );
    } else if (isClientLoading) {
      resultsStatus = (
        <p
          className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
          role="status"
          aria-live="polite"
        >
          Buscando clientes…
        </p>
      );
    } else if (clientResults.length === 0) {
      resultsStatus = (
        <div className="flex flex-col items-center gap-2 px-4 py-6" role="status">
          {clientError ? (
            <p className="text-center text-sm text-red-700 dark:text-red-300" role="alert">
              {clientError}
            </p>
          ) : null}
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            No se encontraron clientes
          </p>
        </div>
      );
    }
  } else if (error) {
    resultsStatus = (
      <p
        className="px-4 py-6 text-center text-sm text-red-700 dark:text-red-300"
        role="alert"
      >
        {isChangingPaymentClient
          ? error
          : "No se pudo buscar. Intenta de nuevo."}
      </p>
    );
  } else if (isReassigning) {
    resultsStatus = (
      <p
        className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
        role="status"
        aria-live="polite"
      >
        Actualizando cliente del pago…
      </p>
    );
  } else if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
    resultsStatus = (
      <p
        className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
        role="status"
      >
        Escribe al menos {MIN_SEARCH_LENGTH} caracteres para buscar
      </p>
    );
  } else if (isLoading) {
    resultsStatus = (
      <p
        className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
        role="status"
        aria-live="polite"
      >
        Buscando…
      </p>
    );
  } else if (results.length === 0) {
    resultsStatus = (
      <div className="flex flex-col items-center gap-4 px-4 py-6" role="status">
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          No se encontraron cuentas
        </p>
        {!isChangingPaymentClient ? (
          <button
            type="button"
            onClick={handleStartLinkClient}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
            aria-label={`Vincular la cuenta ${trimmedQuery} con un cliente`}
          >
            Vincular con un cliente
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-1">
      <Link
        href="/"
        className="fixed left-16 top-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-950"
        aria-label="Volver a servicios"
      >
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Servicios
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center py-16">
        <div
          className="mb-6 flex items-center justify-center gap-3 tablet:mb-8 tablet:gap-4"
          role="group"
          aria-label={`DAIEGO y ${serviceName}`}
        >
          <div className="flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 tablet:h-36 tablet:w-36 tablet:p-3">
            <DaiegoLogo
              width={144}
              height={144}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <div
            className="flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 tablet:h-36 tablet:w-36"
            title={serviceName}
          >
            {serviceImageUrl ? (
              <img
                src={serviceImageUrl}
                alt={`Logo de ${serviceName}`}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <ServicePlaceholder className="h-full w-full" />
            )}
          </div>
        </div>

        <p className="mb-4 max-w-md text-center text-sm font-medium text-zinc-600 dark:text-zinc-300 tablet:text-base">
          {isLinkingClient
            ? `Busca el cliente para vincular la cuenta ${accountToLink}`
            : isChangingPaymentClient
              ? "Selecciona el nuevo cliente vinculado a este servicio"
              : "Busca por nombre de cliente - servicio - cuenta"}
        </p>

        {isLinkingClient ? (
          <div className="mb-2 w-full">
            <label htmlFor={clientSearchInputId} className="sr-only">
              Buscar cliente por nombre o teléfono
            </label>
            <input
              ref={clientInputRef}
              id={clientSearchInputId}
              type="search"
              value={clientSearchQuery}
              onChange={handleClientSearchChange}
              placeholder="Nombre o teléfono del cliente"
              autoComplete="off"
              enterKeyHint="search"
              disabled={isLinking}
              className={inputClassName}
              aria-label="Buscar cliente por nombre o teléfono"
              aria-busy={isClientLoading || isLinking}
              aria-controls="home-search-results"
            />
          </div>
        ) : (
          <div className="mb-2 w-full">
            <label htmlFor={searchInputId} className="sr-only">
              Buscar por nombre de cliente, servicio o cuenta
            </label>
            <input
              ref={inputRef}
              id={searchInputId}
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cliente, servicio o número de cuenta"
              autoComplete="off"
              enterKeyHint="search"
              disabled={isReassigning}
              className={inputClassName}
              aria-label="Buscar por nombre de cliente, servicio o cuenta"
              aria-busy={isLoading || isReassigning}
              aria-controls="home-search-results"
            />
          </div>
        )}

        <div className="mb-4 flex w-full flex-col items-center gap-2">
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            {serviceName}
            {isLinkingClient && accountToLink ? ` · Cuenta ${accountToLink}` : ""}
          </p>
          {isLinkingClient ? (
            <button
              type="button"
              onClick={handleCancelLinkClient}
              disabled={isLinking}
              className="inline-flex min-h-9 items-center justify-center rounded-xl px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-950"
              aria-label="Cancelar vinculación con cliente"
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <div
          id="home-search-results"
          className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
          role="region"
          aria-label={
            isLinkingClient
              ? `Clientes para vincular con ${accountToLink}`
              : `Resultados de búsqueda para ${serviceName}`
          }
          aria-live="polite"
        >
          {resultsStatus ? (
            resultsStatus
          ) : isLinkingClient ? (
            <div>
              {clientError ? (
                <p
                  className="border-b border-red-200 px-4 py-3 text-center text-sm text-red-700 dark:border-red-900/50 dark:text-red-300"
                  role="alert"
                >
                  {clientError}
                </p>
              ) : null}
              <ul className="max-h-[min(50vh,24rem)] divide-y divide-zinc-100 overflow-y-auto p-1 dark:divide-zinc-800">
                {clientResults.map((client) => (
                  <ClientSearchResultRow
                    key={client.id}
                    client={client}
                    isSelected={selectedClientId === client.id}
                    onSelect={handleSelectClient}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <ul className="max-h-[min(50vh,24rem)] divide-y divide-zinc-100 overflow-y-auto p-1 dark:divide-zinc-800">
              {results.map((receipt) => (
                <SearchResultRow
                  key={receipt.id}
                  receipt={receipt}
                  serviceImageUrl={serviceImageUrl}
                  serviceName={serviceName}
                  isSelected={selectedReceiptId === receipt.id}
                  onSelect={handleSelectReceipt}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function HomeSearchViewSkeleton() {
  return (
    <div
      className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-1 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="sr-only">Cargando búsqueda…</p>
      <div className="mb-6 flex items-center justify-center gap-3 tablet:mb-8 tablet:gap-4">
        <div className="h-[7.5rem] w-[7.5rem] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800 tablet:h-36 tablet:w-36" />
        <div className="h-[7.5rem] w-[7.5rem] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800 tablet:h-36 tablet:w-36" />
      </div>
      <div className="mb-4 h-5 w-72 max-w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-2 h-12 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-4 h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-40 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export { HomeSearchView, HomeSearchViewSkeleton };

export function HomeViewSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col items-center px-1 pb-10 pt-8 tablet:pt-12 desktop:pt-14"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-6 h-14 w-[min(100%,16vw)] min-w-36 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800 tablet:mb-8 tablet:h-20 tablet:min-w-44" />
      <div className="mb-8 h-7 w-72 max-w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 tablet:mb-10" />
      <p className="sr-only">Cargando servicios…</p>
      <ul
        className="grid w-full grid-cols-4 gap-3 tablet:grid-cols-6 tablet:gap-4 desktop:grid-cols-8 desktop:gap-4 xl:grid-cols-10"
        aria-hidden
      >
        {Array.from({ length: 20 }, (_, index) => (
          <li key={index} className="min-w-0">
            <div className="flex flex-col items-center gap-1.5">
              <div className="aspect-square w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeView({ services, fetchError }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-1 pb-10 pt-8 tablet:pt-12 desktop:pt-14">
      <div
        className="mb-6 flex w-[min(100%,16vw)] min-w-36 items-center justify-center tablet:mb-8 tablet:min-w-44"
        role="group"
        aria-label="DAIEGO"
      >
        <DaiegoLogo
          width={720}
          height={216}
          priority
          className="h-auto w-full"
        />
      </div>

      <h1 className="mb-8 max-w-xl text-center text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:mb-10 tablet:text-2xl">
        ¡Hola! ¿Qué servicio deseas realizar?
      </h1>

      {fetchError ? (
        <p
          className="max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300"
          role="alert"
        >
          No se pudieron cargar los servicios. Intenta de nuevo más tarde.
        </p>
      ) : services.length === 0 ? (
        <div
          className="flex max-w-md flex-col items-center gap-4 text-center"
          role="status"
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            aria-hidden
          >
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aún no hay servicios disponibles.
          </p>
        </div>
      ) : (
        <ul
          className="grid w-full grid-cols-4 justify-items-stretch gap-3 tablet:grid-cols-6 tablet:gap-4 desktop:grid-cols-8 desktop:gap-4 xl:grid-cols-10"
          aria-label="Servicios disponibles"
        >
          {services.map((service) => (
            <ServiceTile key={service.id} service={service} />
          ))}
        </ul>
      )}
    </div>
  );
}
