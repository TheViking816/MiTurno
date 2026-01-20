import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../services/supabaseService';

type AppSettings = {
  id: number;
  business_name: string | null;
  opening_time: string | null;
  max_hours: number | null;
  qr_token?: string | null;
};

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [maxHours, setMaxHours] = useState(12);
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('app_settings')
          .select('id, business_name, opening_time, max_hours, qr_token')
          .eq('id', 1)
          .maybeSingle<AppSettings>();
        if (fetchError) throw fetchError;
        if (data) {
          setBusinessName(data.business_name || '');
          setOpeningTime(data.opening_time || '08:00');
          setMaxHours(data.max_hours ?? 12);
          setQrToken(data.qr_token || '');
        }
      } catch (err: any) {
        console.error('Error loading settings:', err);
        setError('No se pudieron cargar los ajustes.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: saveError } = await supabase
        .from('app_settings')
        .upsert(
          {
            id: 1,
            business_name: businessName.trim(),
            opening_time: openingTime,
            max_hours: maxHours,
            qr_token: qrToken || null
          },
          { onConflict: 'id' }
        );
      if (saveError) throw saveError;
      setSuccess('Ajustes guardados.');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError('No se pudieron guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  };

  const qrValue = useMemo(() => {
    if (!qrToken) return '';
    return `${window.location.origin}/#/employee-main?point=${encodeURIComponent(qrToken)}`;
  }, [qrToken]);

  const regenerateQr = async () => {
    const nextToken = crypto.randomUUID();
    setQrToken(nextToken);
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: saveError } = await supabase
        .from('app_settings')
        .upsert(
          {
            id: 1,
            business_name: businessName.trim(),
            opening_time: openingTime,
            max_hours: maxHours,
            qr_token: nextToken
          },
          { onConflict: 'id' }
        );
      if (saveError) throw saveError;
      setSuccess('QR regenerado y guardado.');
    } catch (err: any) {
      console.error('Error regenerating QR:', err);
      setError('No se pudo regenerar el QR.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#171412] dark:text-gray-100 font-display min-h-screen pb-32 max-w-md mx-auto">
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 pt-8 pb-4 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md">
        <h1 className="text-2xl font-black tracking-tight">Ajustes</h1>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="text-primary font-black text-sm uppercase tracking-widest disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </header>

      <main className="px-6 pt-2 space-y-8 animate-appear">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-sm font-bold">
            {success}
          </div>
        )}

        <section className="space-y-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 p-6 shadow-card">
            <label className="block">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Negocio</span>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-primary">
                  <span className="material-symbols-outlined font-bold">storefront</span>
                </span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-black/20 border-none rounded-2xl text-lg font-bold"
                  placeholder="Nombre del local"
                />
              </div>
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="px-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Configuracion Horaria</h3>
          <div className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-50 shadow-card">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                  <span className="material-symbols-outlined font-bold">schedule</span>
                </div>
                <span className="font-bold">Apertura</span>
              </div>
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="font-black text-xl bg-transparent text-right outline-none"
              />
            </div>
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
                  <span className="material-symbols-outlined font-bold">hourglass_top</span>
                </div>
                <span className="font-bold">Limite Maximo</span>
              </div>
              <div className="flex items-center bg-gray-50 dark:bg-black/20 rounded-2xl p-1 gap-2">
                <button
                  onClick={() => setMaxHours((prev) => Math.max(1, prev - 1))}
                  className="size-10 flex items-center justify-center font-black text-xl"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={maxHours}
                  onChange={(e) => setMaxHours(Number(e.target.value))}
                  className="w-16 text-center font-black text-lg bg-transparent outline-none"
                />
                <button
                  onClick={() => setMaxHours((prev) => Math.min(24, prev + 1))}
                  className="size-10 flex items-center justify-center font-black text-xl"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-2">
          <h3 className="px-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Punto de Fichaje</h3>
          <div className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 p-8 shadow-soft flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-300 via-primary to-orange-400"></div>

            <div className="mb-8 relative group bg-white p-6 rounded-3xl shadow-xl border border-gray-50">
              {qrValue ? (
                <QRCodeSVG value={qrValue} size={192} bgColor="#ffffff" fgColor="#111111" />
              ) : (
                <div className="w-48 h-48 rounded-2xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                  Sin QR
                </div>
              )}
            </div>

            <button
              onClick={regenerateQr}
              disabled={saving || loading}
              className="w-full py-5 px-4 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 mb-4 uppercase tracking-widest disabled:opacity-60"
            >
              Regenerar QR
            </button>
            <div className="flex gap-4 w-full">
              <button onClick={() => navigate('/export')} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black text-xs uppercase tracking-widest">Exportar</button>
              <button className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black text-xs uppercase tracking-widest">Imprimir</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Settings;
