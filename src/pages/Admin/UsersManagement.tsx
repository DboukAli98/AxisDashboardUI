import { useEffect, useState, useCallback } from "react";
import Modal from "../../components/ui/Modal";
import { useModal } from "../../hooks/useModal";
import userService, { UserDto, RegisterRequest } from "../../services/userService";
import { updateUser } from "../../services/userService";
import Loader from "../../components/ui/Loader";

export default function UsersManagement() {
    const { isOpen, openModal, closeModal } = useModal();
    const [users, setUsers] = useState<UserDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page] = useState(1);
    const [pageSize] = useState(10);

    // form
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [roleName, setRoleName] = useState("cashier");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await userService.getUsers(page, pageSize);
            setUsers(res.items);
        } catch (e: unknown) {
            console.error(e);
            let msg = 'Failed to load users';
            if (e instanceof Error) msg = e.message;
            else msg = String(e);
            setMessage(msg);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleOpen = () => {
        setEmail('');
        setPassword('');
        setDisplayName('');
        setRoleName('cashier');
        setEditingId(null);
        setMessage(null);
        openModal();
    };

    const handleEdit = (u: UserDto) => {
        setEditingId(u.id);
        setEmail(u.email);
        setDisplayName(u.displayName);
        setRoleName(u.roles?.[0] || 'cashier');
        setPassword('');
        setMessage(null);
        openModal();
    };

    const handleRegister = async () => {
        setSaving(true);
        setMessage(null);
        try {
            if (editingId) {
                // update
                const updateBody = { displayName, email, roles: [roleName] };
                const res = await updateUser(editingId, updateBody);
                setMessage(res?.message || 'User updated');
                closeModal();
                loadUsers();
                return;
            }
            const body: RegisterRequest = { email, password, displayName, roleName };
            const res = await userService.registerUser(body);
            setMessage(res?.message || 'User created');
            closeModal();
            loadUsers();
        } catch (err: unknown) {
            console.error(err);
            let msg = 'Registration failed';
            if (err instanceof Error) msg = err.message;
            else msg = String(err);
            // try to extract nested response message if present
            // if axios-like error shape exists, try to read nested message
            const maybeResponse = (err as unknown) as { response?: { data?: { message?: unknown } } };
            const maybe = maybeResponse?.response?.data?.message;
            if (typeof maybe === 'string' && maybe.length) msg = maybe;
            setMessage(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold">Users Management</h1>
                <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={handleOpen}>Add User</button>
            </div>

            {loading ? (
                <Loader />
            ) : (
                <div className="overflow-x-auto bg-white rounded shadow">
                    <table className="min-w-full divide-y">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y">
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{u.displayName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{u.roles.join(', ')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button className="text-sm text-blue-600" onClick={() => handleEdit(u)}>Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={isOpen} onClose={closeModal} title={editingId ? 'Edit User' : 'Create User'}>
                <div className="space-y-4">
                    {message && <div className="text-sm text-red-600">{message}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 input" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 input" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Display Name</label>
                        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 input" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select value={roleName} onChange={(e) => setRoleName(e.target.value)} className="mt-1 input">
                            <option value="cashier">cashier</option>
                            <option value="admin">admin</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button className="bg-gray-200 text-gray-800 px-3 py-1 rounded" onClick={closeModal} disabled={saving}>Cancel</button>
                        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleRegister} disabled={saving}>{saving ? 'Saving...' : (editingId ? 'Save' : 'Create')}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
