"use client";

import {
	keepPreviousData,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";
import type { PaginatedResult } from "@/lib/pagination";
import { getUser, listUsers, USER_KEY } from "@/lib/services/users";
import type { User } from "./types";
import UserPermissionsTable from "./UserPermissionsTable";
import UsersTable from "./UsersTable";

const INITIAL_USER_DATA: PaginatedResult<User> = {
	items: [],
	count: 0,
	next: null,
	previous: null,
};

const pageSize = 10;

export default function UsersPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = React.useState<number>(1);
	const [search, setSearch] = React.useState<string>("");

	const { data, isPending, error } = useQuery<PaginatedResult<User>, string>({
		queryKey: [USER_KEY, search, page],
		queryFn: () => listUsers(page, search, pageSize),
		placeholderData: keepPreviousData,
		initialData: INITIAL_USER_DATA,
	});

	const totalPages = Math.max(1, Math.ceil(data.count / pageSize));

	const [selectedUserId, setSelectedUserId] = React.useState<number | null>(
		null,
	);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
			{error && (
				<div className="rounded-lg border bg-card p-4 text-red-600">
					{error}
				</div>
			)}
			{isPending && (
				<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
					<p>Cargando usuarios...</p>
				</div>
			)}
			<UsersTable
				users={data.items}
				onSelectUser={(id) => setSelectedUserId(id)}
				onRefresh={() =>
					queryClient.invalidateQueries({ queryKey: [USER_KEY] })
				}
				serverSide={true}
				currentPage={page}
				totalPages={totalPages}
				onPageChange={(page) => setPage(page)}
				pageSize={pageSize}
				onSearch={(term) => {
					setSearch(term);
				}}
			/>
			<UserPermisions selectedUserId={selectedUserId} />
		</div>
	);
}

function UserPermisions({
	selectedUserId,
}: Readonly<{ selectedUserId: number | null }>) {
	const queryClient = useQueryClient();

	const { data } = useQuery({
		queryKey: [USER_KEY, selectedUserId],
		queryFn: () => getUser(selectedUserId ?? 0),
		enabled: selectedUserId != null,
	});

	if (!data) {
		return (
			<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
				<p className="text-sm text-muted-foreground">
					Selecciona un usuario para ver y editar sus permisos.
				</p>
			</div>
		);
	}

	const userLabel = data.username ?? data.name ?? `#${data.id}`;

	return (
		<UserPermissionsTable
			userId={data.id}
			userLabel={userLabel}
			onUpdated={() => queryClient.invalidateQueries({ queryKey: [USER_KEY] })}
		/>
	);
}
