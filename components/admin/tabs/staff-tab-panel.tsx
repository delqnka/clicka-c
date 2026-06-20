'use client';

import { useState, useCallback } from 'react';
import { UserRound, Plus, Trash2, PowerOff, Power, AlertCircle, X, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminSection } from '@/components/admin/admin-ui';
import type { StaffMember } from '@/lib/staff-members';
import type { ServiceItem } from '@/lib/salon-services';

type Props = {
  salonSlug: string;
  sitePublicUrl: string;
  initialStaff: StaffMember[];
  planLimit: number;
  salonServices?: ServiceItem[];
};

function Badge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: active ? '#dcfce7' : '#f4f4f5',
        color: active ? '#15803d' : ADMIN_T.muted,
      }}
    >
      {active ? 'Активен' : 'Неактивен'}
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Копирай ${label}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 6, border: `1px solid ${ADMIN_T.border}`,
        background: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer',
        color: copied ? '#15803d' : ADMIN_T.muted, flexShrink: 0,
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Копирано' : 'Копирай'}
    </button>
  );
}

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  busy,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
          <AlertCircle size={22} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 14, color: ADMIN_T.text, lineHeight: 1.55 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '7px 16px', borderRadius: 8, border: `1px solid ${ADMIN_T.border}`,
              background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: ADMIN_T.text,
            }}
          >
            Отказ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Изтриване…' : 'Изтрий'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceAssignPanel({
  member,
  salonServices,
  salonSlug,
  onUpdate,
}: {
  member: StaffMember;
  salonServices: ServiceItem[];
  salonSlug: string;
  onUpdate: (serviceIds: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assigned = new Set(member.serviceIds);

  const toggle = useCallback(async (serviceId: string) => {
    const next = new Set(assigned);
    if (next.has(serviceId)) {
      next.delete(serviceId);
    } else {
      next.add(serviceId);
    }
    const nextIds = Array.from(next);
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/staff?slug=${encodeURIComponent(salonSlug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, serviceIds: nextIds }),
      });
      if (!r.ok) throw new Error('Грешка');
      onUpdate(nextIds);
    } catch {
      setError('Грешка при запис. Опитайте отново.');
    } finally {
      setBusy(false);
    }
  }, [member.id, member.serviceIds, salonSlug, onUpdate, assigned]);

  if (salonServices.length === 0) {
    return <p style={{ fontSize: 12, color: ADMIN_T.muted, marginTop: 8 }}>Няма добавени услуги в салона.</p>;
  }

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: ADMIN_T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Услуги</p>
      {error ? <p style={{ fontSize: 12, color: '#b91c1c', marginBottom: 6 }}>{error}</p> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {salonServices.map((svc) => {
          const id = svc.id ?? '';
          if (!id) return null;
          const on = assigned.has(id);
          return (
            <button
              key={id}
              type="button"
              disabled={busy}
              onClick={() => void toggle(id)}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: busy ? 'wait' : 'pointer',
                border: on ? '1.5px solid #7C3AED' : `1px solid ${ADMIN_T.border}`,
                background: on ? '#f5f3ff' : '#fff',
                color: on ? '#7C3AED' : ADMIN_T.muted,
                opacity: busy ? 0.6 : 1,
                transition: 'all 0.12s',
              }}
            >
              {on ? '✓ ' : ''}{svc.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PortalLinkInfo({ member, salonSlug }: { member: StaffMember; salonSlug: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmRegen, setConfirmRegen] = useState(false);

  const generate = useCallback(async (regenerate: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/admin/staff/${member.id}/portal-link?slug=${encodeURIComponent(salonSlug)}${regenerate ? '&regenerate=1' : ''}`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Грешка при генериране на линка');
        return;
      }
      setLink(json.url);
      setConfirmRegen(false);
    } catch {
      setError('Грешка при свързване със сървъра');
    } finally {
      setLoading(false);
    }
  }, [member.id, salonSlug]);

  return (
    <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: ADMIN_T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Линк за достъп до график
      </p>
      <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.muted, lineHeight: 1.5 }}>
        Сподели този линк със служителя — той вижда само своя график и може сам да добавя резервации, без нужда от вход в админ панела.
      </p>
      {link ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#7C3AED', fontFamily: 'monospace', wordBreak: 'break-all' }}>{link}</span>
          <CopyButton value={link} label="линк" />
        </div>
      ) : null}
      {error ? <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>{error}</p> : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!link ? (
          <button
            type="button"
            onClick={() => void generate(false)}
            disabled={loading}
            style={{
              padding: '6px 12px', borderRadius: 8, border: `1px solid ${ADMIN_T.border}`,
              background: '#fff', fontSize: 12, fontWeight: 500, cursor: loading ? 'wait' : 'pointer',
              color: ADMIN_T.text,
            }}
          >
            {loading ? 'Генерираме…' : 'Генерирай линк'}
          </button>
        ) : !confirmRegen ? (
          <button
            type="button"
            onClick={() => setConfirmRegen(true)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: `1px solid ${ADMIN_T.border}`,
              background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: ADMIN_T.muted,
            }}
          >
            Регенерирай (старият линк ще спре да работи)
          </button>
        ) : (
          <>
            <span style={{ fontSize: 12, color: '#92400e' }}>Сигурен ли си? Старият линк ще престане да работи.</span>
            <button
              type="button"
              onClick={() => void generate(true)}
              disabled={loading}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? 'Генерираме…' : 'Да, регенерирай'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRegen(false)}
              style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${ADMIN_T.border}`, background: '#fff', fontSize: 12, color: ADMIN_T.muted, cursor: 'pointer' }}
            >
              Отказ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function OnboardingInfo({ member, sitePublicUrl }: { member: StaffMember; sitePublicUrl: string }) {
  const bookingUrl = `${sitePublicUrl.replace(/\/$/, '')}/book/${member.slug}`;
  return (
    <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: ADMIN_T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Онбординг</p>
      {member.onboardingCode ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: ADMIN_T.muted }}>Telegram код:</span>
          <code style={{
            background: '#f4f4f5', borderRadius: 6, padding: '2px 8px',
            fontSize: 13, fontWeight: 700, color: ADMIN_T.text, letterSpacing: '0.08em',
          }}>
            {member.onboardingCode}
          </code>
          <CopyButton value={member.onboardingCode} label="код" />
        </div>
      ) : (
        <p style={{ fontSize: 12, color: ADMIN_T.muted }}>Кодът ще се появи след опресняване.</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: ADMIN_T.muted }}>Линк за резервации:</span>
        <span style={{ fontSize: 12, color: '#7C3AED', fontFamily: 'monospace', wordBreak: 'break-all' }}>{bookingUrl}</span>
        <CopyButton value={bookingUrl} label="линк" />
      </div>
    </div>
  );
}

export function StaffTabPanel({ salonSlug, sitePublicUrl, initialStaff, planLimit, salonServices = [] }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const showNotice = useCallback((type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }, []);

  const toggleActive = useCallback(async (member: StaffMember) => {
    const key = `toggle-${member.id}`;
    setBusy(key);
    try {
      const r = await fetch(`/api/admin/staff?slug=${encodeURIComponent(salonSlug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, isActive: !member.isActive }),
      });
      if (!r.ok) throw new Error('Грешка');
      setStaff((prev) => prev.map((m) => m.id === member.id ? { ...m, isActive: !m.isActive } : m));
      showNotice('ok', member.isActive ? `${member.name} е деактивиран.` : `${member.name} е активиран.`);
    } catch {
      showNotice('err', 'Неуспешна операция. Опитайте отново.');
    } finally {
      setBusy(null);
    }
  }, [salonSlug, showNotice]);

  const handleDelete = useCallback(async (id: string) => {
    setBusy(`delete-${id}`);
    try {
      const r = await fetch(
        `/api/admin/staff?slug=${encodeURIComponent(salonSlug)}&id=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      const data = await r.json() as { error?: string; futureCount?: number };
      if (!r.ok) {
        showNotice('err', data.error ?? 'Грешка при изтриване.');
        setConfirmDelete(null);
        return;
      }
      setStaff((prev) => prev.filter((m) => m.id !== id));
      showNotice('ok', 'Служителят е изтрит.');
    } catch {
      showNotice('err', 'Грешка при изтриване. Опитайте отново.');
    } finally {
      setBusy(null);
      setConfirmDelete(null);
    }
  }, [salonSlug, showNotice]);

  const handleAdd = useCallback(async () => {
    if (!addName.trim()) return;
    setBusy('add');
    try {
      const r = await fetch(`/api/admin/staff?slug=${encodeURIComponent(salonSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim(), email: addEmail.trim() || null }),
      });
      const data = await r.json() as { staff?: StaffMember; error?: string };
      if (!r.ok) {
        showNotice('err', data.error ?? 'Грешка.');
        return;
      }
      if (data.staff) setStaff((prev) => [...prev, data.staff!]);
      setAddName('');
      setAddEmail('');
      setAddOpen(false);
      showNotice('ok', `${data.staff?.name ?? 'Служителят'} е добавен.`);
    } catch {
      showNotice('err', 'Грешка при добавяне.');
    } finally {
      setBusy(null);
    }
  }, [salonSlug, addName, addEmail, showNotice]);

  const updateMemberServices = useCallback((memberId: string, serviceIds: string[]) => {
    setStaff((prev) => prev.map((m) => m.id === memberId ? { ...m, serviceIds } : m));
  }, []);

  const nonOwners = staff.filter((m) => !m.isOwner);
  const canAdd = nonOwners.length < planLimit;

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: `1px solid ${ADMIN_T.border}`, fontSize: 13,
    color: ADMIN_T.text, background: '#fff', boxSizing: 'border-box',
  };

  return (
    <>
      {confirmDelete ? (
        <ConfirmModal
          message={`Сигурни ли сте, че искате да изтриете ${confirmDelete.name}? Тази операция не може да бъде върната назад.`}
          onConfirm={() => void handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          busy={busy === `delete-${confirmDelete.id}`}
        />
      ) : null}

      <AdminSection
        title="Служители"
        desc={`${nonOwners.length} / ${planLimit} служителя (ти като собственик не влизаш в този брой)`}
        action={
          canAdd ? (
            <button
              type="button"
              onClick={() => setAddOpen((v) => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                borderRadius: 8, border: 'none', color: '#fff',
                background: 'linear-gradient(135deg, #FF4FD8 0%, #7C3AED 100%)',
                boxShadow: '0 4px 12px rgba(124,58,237,0.22)',
                padding: '6px 10px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <Plus size={13} />
              Добави
            </button>
          ) : (
            <span style={{ fontSize: 12, color: ADMIN_T.muted }}>Лимит достигнат</span>
          )
        }
      >
        {notice ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 8, marginBottom: 12,
              background: notice.type === 'ok' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${notice.type === 'ok' ? '#bbf7d0' : '#fecaca'}`,
              color: notice.type === 'ok' ? '#15803d' : '#b91c1c',
              fontSize: 13,
            }}
          >
            {notice.text}
            <button type="button" onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'inherit', opacity: 0.6 }}>
              <X size={14} />
            </button>
          </div>
        ) : null}

        {addOpen ? (
          <div
            style={{
              marginBottom: 16, padding: 14, borderRadius: 10,
              border: `1px solid ${ADMIN_T.border}`, background: '#fafafa',
              display: 'grid', gap: 10,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ADMIN_T.muted, marginBottom: 4 }}>Име *</label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Мария Иванова"
                  style={inp}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ADMIN_T.muted, marginBottom: 4 }}>Имейл</label>
                <input
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="maria@salon.bg"
                  type="email"
                  style={inp}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setAddOpen(false); setAddName(''); setAddEmail(''); }}
                style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${ADMIN_T.border}`, background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: ADMIN_T.text }}
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={!addName.trim() || busy === 'add'}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: '#16A34A', color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: busy === 'add' || !addName.trim() ? 'not-allowed' : 'pointer',
                  opacity: busy === 'add' || !addName.trim() ? 0.6 : 1,
                }}
              >
                {busy === 'add' ? 'Добавяне…' : 'Добави'}
              </button>
            </div>
          </div>
        ) : null}

        {nonOwners.length === 0 ? (
          <p style={{ fontSize: 14, color: ADMIN_T.muted, padding: '24px 0', textAlign: 'center' }}>
            Няма добавени служители.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {nonOwners.map((member) => {
              const isBusyToggle = busy === `toggle-${member.id}`;
              const isBusyDelete = busy === `delete-${member.id}`;
              const expanded = expandedId === member.id;
              return (
                <div
                  key={member.id}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${ADMIN_T.border}`,
                    background: member.isActive ? '#fff' : '#fafafa',
                    opacity: member.isActive ? 1 : 0.75,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header row */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(145deg, #fafafa, #f0f0f0)',
                        border: `1px solid ${ADMIN_T.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <UserRound size={18} color={ADMIN_T.muted} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: ADMIN_T.text }}>{member.name}</span>
                        <Badge active={member.isActive} />
                      </div>
                      {member.email ? (
                        <p style={{ fontSize: 12, color: ADMIN_T.muted, marginTop: 2 }}>{member.email}</p>
                      ) : null}
                      <p style={{ fontSize: 11, color: ADMIN_T.subtle, marginTop: 2 }}>
                        /book/{member.slug}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        title={expanded ? 'Скрий детайли' : 'Детайли'}
                        onClick={() => setExpandedId(expanded ? null : member.id)}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: `1px solid ${ADMIN_T.border}`,
                          background: expanded ? '#f5f3ff' : '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {expanded ? <ChevronUp size={14} color="#7C3AED" /> : <ChevronDown size={14} color={ADMIN_T.muted} />}
                      </button>
                      <button
                        type="button"
                        title={member.isActive ? 'Деактивирай' : 'Активирай'}
                        onClick={() => void toggleActive(member)}
                        disabled={isBusyToggle}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: `1px solid ${ADMIN_T.border}`,
                          background: '#fff', cursor: isBusyToggle ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: isBusyToggle ? 0.5 : 1,
                        }}
                      >
                        {member.isActive
                          ? <PowerOff size={14} color="#f97316" />
                          : <Power size={14} color="#16a34a" />
                        }
                      </button>
                      <button
                        type="button"
                        title="Изтрий"
                        onClick={() => setConfirmDelete({ id: member.id, name: member.name })}
                        disabled={isBusyDelete}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: `1px solid #fecaca`,
                          background: '#fff', cursor: isBusyDelete ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: isBusyDelete ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel: services + onboarding */}
                  {expanded ? (
                    <div
                      style={{
                        borderTop: `1px solid ${ADMIN_T.border}`,
                        padding: '12px 14px',
                        background: '#fafafa',
                        display: 'grid',
                        gap: 0,
                      }}
                    >
                      <ServiceAssignPanel
                        member={member}
                        salonServices={salonServices}
                        salonSlug={salonSlug}
                        onUpdate={(ids) => updateMemberServices(member.id, ids)}
                      />
                      <OnboardingInfo member={member} sitePublicUrl={sitePublicUrl} />
                      {!member.isOwner ? <PortalLinkInfo member={member} salonSlug={salonSlug} /> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </AdminSection>
    </>
  );
}
