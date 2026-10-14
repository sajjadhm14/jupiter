import { useCallback, useEffect, useRef, useState } from 'react';

const fa = new Intl.NumberFormat('fa-IR');
const dayFormat = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
const dateFormat = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const icons = {
  check: <path d="m5 12 4 4L19 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 5h3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  edit: <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
  leaf: <><path d="M20 3C8 1 2 8 5 15s17 6 15-12Z" /><path d="M3 21 15 9M8 16v-5m0 5h5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  logout: <><path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" /></>,
};
function Icon({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{icons[name]}</svg>;
}
async function api(path, options = {}) {
  let response;
  try { response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('ارتباط با سرور برقرار نشد. اتصال را بررسی کنید.'); }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !['/auth/login', '/auth/register'].includes(path)) window.dispatchEvent(new Event('session-expired'));
    const error = new Error(data.details?.[0]?.message || data.error || 'دریافت اطلاعات ناموفق بود. دوباره تلاش کنید.');
    error.status = response.status;
    throw error;
  }
  return data;
}
function localDateInput(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function isToday(value) { return new Date(value).toDateString() === new Date().toDateString(); }

function TaskForm({ task, reminderEmail, onClose, onSave }) {
  const dialog = useRef(null);
  const [form, setForm] = useState({
    title: task?.title || '', description: task?.description || '',
    reminderAt: localDateInput(task?.reminderAt || Date.now() + 3600000),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  const field = name => ({ value: form[name], onChange: event => setForm({ ...form, [name]: event.target.value }) });
  async function submit(event) {
    event.preventDefault(); setError('');
    if (!form.title.trim()) { setError('عنوان تسک را وارد کنید.'); return; }
    if (!Number.isFinite(new Date(form.reminderAt).getTime())) { setError('زمان یادآوری معتبر نیست.'); return; }
    setSaving(true);
    try {
      await onSave({ ...form, title: form.title.trim(), reminderAt: new Date(form.reminderAt).toISOString() });
      onClose();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  return <dialog ref={dialog} className="task-dialog" aria-labelledby="form-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="dialog-heading"><div><span className="eyebrow">یک قدم برای خودت</span><h2 id="form-title">{task ? 'ویرایش تسک' : 'چه کاری در پیش داری؟'}</h2></div><button className="icon-button" aria-label="بستن" onClick={onClose} disabled={saving}><Icon name="close" /></button></div>
    <form onSubmit={submit}>
      <label>عنوان تسک <input autoFocus required maxLength={200} placeholder="مثلاً ۲۰ دقیقه کتاب بخوانم" {...field('title')} /></label>
      <label>توضیحات <span className="optional">(اختیاری)</span><textarea rows="3" maxLength={5000} placeholder="چیزی که بهتره یادت بمونه…" {...field('description')} /></label>
      <label>زمان یادآوری <input type="datetime-local" dir="ltr" required {...field('reminderAt')} /><small>به وقت دستگاه شما: <bdi>{timezone}</bdi> · تاریخ ورودی میلادی است.</small></label>
      <div className="form-note"><Icon name="mail" /><span>اگر تسک انجام نشده باشد، یادآوری به <bdi>{reminderEmail}</bdi> ارسال می‌شود. این آدرس را می‌توانی در پروفایل تغییر بدهی.</span></div>
      {new Date(form.reminderAt).getTime() < Date.now() && <p className="past-note">این زمان گذشته است؛ یادآوری در نوبت بعدی بررسی ارسال می‌شود.</p>}
      {error && <p role="alert" className="error-text">{error}</p>}
      <div className="dialog-actions"><button className="primary" disabled={saving}>{saving ? 'در حال ذخیره…' : task ? 'ذخیرهٔ تغییرات' : 'افزودن تسک'}<Icon name="check" size={18} /></button><button type="button" className="secondary" onClick={onClose} disabled={saving}>انصراف</button></div>
    </form>
  </dialog>;
}

function Brand() {
  return <a className="brand" href="/" aria-label="یادآوری، خانه"><span className="brand-mark"><Icon name="check" size={25} /></span><div><strong>یادآوری<span className="brand-dot">.</span></strong><small>یک قدم جلوتر، هر روز</small></div></a>;
}

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const registering = mode === 'register';
  function switchMode(next) { setMode(next); setForm({ username: '', email: '', password: '' }); setError(''); setShowPassword(false); }
  const field = name => ({ value: form[name], onChange: event => setForm(current => ({ ...current, [name]: event.target.value })) });
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const data = registering ? form : { username: form.username, password: form.password };
      const result = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(data) });
      onAuthenticated(result.user);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  return <main className="auth-shell">
    <div className="auth-top"><Brand /><span>فضایی برای کارهای کوچک و هدف‌های بزرگ</span></div>
    <div className="auth-card">
      <section className="auth-story"><span className="auth-tag">یک قدم برای خودت</span><div className="auth-illustration" aria-hidden="true"><div className="auth-paper"><span /><span /><span /><i><Icon name="check" size={35} /></i></div><span className="auth-spark">✦</span></div><h1>کارهای تو،<br />فضای خودت<span>.</span></h1><p>برنامه‌ات رو بنویس، زمان بده و با خیال سبک‌تر به روزت برس.</p><div className="auth-benefit"><Icon name="lock" size={18} />تسک‌ها در حساب شخصی خودت</div><div className="auth-benefit"><Icon name="mail" size={18} />یادآوری به ایمیلی که انتخاب می‌کنی</div></section>
      <section className="auth-form-section" aria-labelledby="auth-title">
        <div className="auth-tabs"><button type="button" className={!registering ? 'active' : ''} aria-pressed={!registering} disabled={saving} onClick={() => switchMode('login')}>ورود</button><button type="button" className={registering ? 'active' : ''} aria-pressed={registering} disabled={saving} onClick={() => switchMode('register')}>ثبت‌نام</button></div>
        <h2 id="auth-title">{registering ? 'حساب خودت رو بساز' : 'خوش برگشتی!'}</h2><p className="auth-description">{registering ? 'یک شروع تازه برای روزهای منظم‌تر.' : 'با نام کاربری و رمز عبورت وارد شو.'}</p>
        <form className="account-form" onSubmit={submit}>
          <label htmlFor="auth-username">نام کاربری</label><input id="auth-username" autoComplete="username" autoCapitalize="none" spellCheck={false} dir="ltr" required minLength={registering ? 3 : 1} maxLength={32} pattern={registering ? '[a-zA-Z0-9_]+' : undefined} placeholder="your_username" disabled={saving} {...field('username')} />
          {registering && <><small className="field-hint">۳ تا ۳۲ کاراکتر؛ حروف انگلیسی، عدد و زیرخط.</small><label htmlFor="auth-email">ایمیل</label><input id="auth-email" type="email" autoComplete="email" dir="ltr" required maxLength={254} placeholder="you@example.com" disabled={saving} {...field('email')} /></>}
          <label htmlFor="auth-password">رمز عبور</label><div className="password-field"><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} dir="ltr" required minLength={registering ? 8 : 1} maxLength={128} placeholder={registering ? 'حداقل ۸ کاراکتر' : 'رمز عبور شما'} disabled={saving} {...field('password')} /><button type="button" aria-label={showPassword ? 'پنهان‌کردن رمز عبور' : 'نمایش رمز عبور'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'پنهان' : 'نمایش'}</button></div>
          {registering && <div className="auth-note"><Icon name="mail" size={17} /><span>ایمیل یادآوری در ابتدا همین ایمیل است؛ بعداً از پروفایل تغییرش بده.</span></div>}
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="primary auth-submit" disabled={saving}>{saving ? 'لطفاً صبر کن…' : registering ? 'ساخت حساب کاربری' : 'ورود به حساب'}<Icon name="arrow" size={18} /></button>
        </form>
        <p className="auth-switch">{registering ? 'قبلاً ثبت‌نام کردی؟' : 'هنوز حساب نداری؟'} <button className="text-button" disabled={saving} onClick={() => switchMode(registering ? 'login' : 'register')}>{registering ? 'وارد شو' : 'ثبت‌نام کن'}</button></p>
      </section>
    </div><p className="auth-footer">هر تیک، یک قدم جلوتر.</p>
  </main>;
}

function ProfilePage({ user, onUserChange, onLogout, onBack }) {
  const [reminderEmail, setReminderEmail] = useState(user.reminderEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { setReminderEmail(user.reminderEmail); }, [user.reminderEmail]);
  async function save(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const result = await api('/profile', { method: 'PATCH', body: JSON.stringify({ reminderEmail }) });
      onUserChange(result.user); setReminderEmail(result.user.reminderEmail); setNotice('ایمیل یادآوری ذخیره شد. یادآوری‌های بعدی به این آدرس می‌روند.');
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function logout() { setSaving(true); setError(''); try { await onLogout(); } catch (err) { setError(err.message); setSaving(false); } }
  return <div className="profile-page">
    <section className="page-heading"><div><div className="eyebrow">حساب شخصی تو</div><h1>پروفایل من<span className="heading-dot">.</span></h1><p>اطلاعات حسابت و جایی که یادآوری‌ها بهش می‌رسن.</p></div><button className="secondary" onClick={onBack}><Icon name="arrow" size={17} />تسک‌های من</button></section>
    <div className="profile-grid">
      <section className="account-card"><div className="account-identity"><span className="avatar big-avatar">{user.username[0].toUpperCase()}</span><h2><bdi>{user.username}</bdi></h2><span>حساب کاربری</span></div><dl><dt>نام کاربری</dt><dd dir="ltr">{user.username}</dd><dt>ایمیل ثبت‌نام</dt><dd dir="ltr">{user.email}</dd></dl><p className="profile-small-note">برای ورود از نام کاربری و رمز عبور استفاده کن.</p><button className="logout-button" onClick={logout} disabled={saving}><Icon name="logout" size={18} />خروج از حساب</button></section>
      <section className="reminder-settings"><div className="settings-heading"><span className="stat-icon blue"><Icon name="mail" size={23} /></span><div><h2>ایمیل یادآوری</h2><p>یادآوری‌ها را همان‌جایی ببین که بیشتر سر می‌زنی.</p></div></div><form className="account-form" onSubmit={save}><label htmlFor="reminder-email">می‌خواهید ایمیل یادآوری به کدام حساب برود؟</label><input id="reminder-email" type="email" dir="ltr" required maxLength={254} autoComplete="email" value={reminderEmail} onChange={event => { setReminderEmail(event.target.value); setNotice(''); }} disabled={saving} /><small className="field-hint">مقدار پیش‌فرض، ایمیل ثبت‌نام توست. می‌توانی هر ایمیل دیگری را وارد کنی.</small><button type="button" className="text-button reset-email" disabled={saving || reminderEmail === user.email} onClick={() => { setReminderEmail(user.email); setNotice(''); }}>استفاده از ایمیل ثبت‌نام</button><div className="profile-info"><Icon name="bell" size={18} /><p>تغییر این آدرس روی یادآوری‌های ارسال‌نشده و تسک‌های جدید اعمال می‌شود. ایمیل ثبت‌نام و اطلاعات ورودت تغییری نمی‌کنند.</p></div>{error && <p className="error-text" role="alert">{error}</p>}{notice && <p className="success-text" role="status"><Icon name="check" size={17} />{notice}</p>}<button className="primary" disabled={saving || reminderEmail === user.reminderEmail}>{saving ? 'در حال ذخیره…' : 'ذخیرهٔ تغییرات'}<Icon name="check" size={17} /></button></form></section>
    </div>
  </div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const checkSession = useCallback(async () => {
    setChecking(true); setError('');
    try { setUser((await api('/auth/me')).user); }
    catch (err) { if (err.status !== 401) setError(err.message); }
    finally { setChecking(false); }
  }, []);
  useEffect(() => { checkSession(); const expire = () => setUser(null); window.addEventListener('session-expired', expire); return () => window.removeEventListener('session-expired', expire); }, [checkSession]);
  if (checking) return <div className="session-loading" role="status"><Brand /><div className="loading-ring" /><p>در حال بررسی حساب…</p></div>;
  if (error) return <div className="session-loading"><Brand /><p className="error-text" role="alert">{error}</p><button className="primary" onClick={checkSession}>تلاش دوباره</button></div>;
  if (!user) return <AuthPage onAuthenticated={setUser} />;
  return <Dashboard key={user.id} user={user} onUserChange={setUser} onLogout={async () => { await api('/auth/logout', { method: 'POST', body: '{}' }); setUser(null); }} />;
}

function Dashboard({ user, onUserChange, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [config, setConfig] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(null);
  const [view, setView] = useState('tasks');
  const revision = useRef(0);
  const mutating = useRef(false);
  const refresh = useCallback(async () => {
    if (mutating.current) return;
    const version = ++revision.current;
    try {
      const [list, settings, profile] = await Promise.all([api('/tasks'), api('/config'), api('/profile')]);
      if (version === revision.current) { setTasks(list); setConfig(settings); onUserChange(profile.user); setError(''); }
    } catch (err) { if (version === revision.current) setError(err.message); }
    finally { if (version === revision.current) setLoading(false); }
  }, [onUserChange]);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); return () => { clearInterval(timer); revision.current++; }; }, [refresh]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); }, [notice]);

  async function mutate(path, method, data, message) {
    revision.current++; mutating.current = true; setBusy(path);
    try {
      const result = await api(path, { method, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
      setTasks(current => method === 'DELETE' ? current.filter(task => !path.endsWith(task.id)) : [...current.filter(task => task.id !== result.id), result].sort((a, b) => new Date(a.reminderAt) - new Date(b.reminderAt)));
      setNotice(message); setError(''); return result;
    } finally { mutating.current = false; setBusy(null); }
  }
  async function act(path, method, data, message) { try { await mutate(path, method, data, message); } catch (err) { setError(err.message); } }

  const pending = tasks.filter(task => !task.completedAt);
  const done = tasks.filter(task => task.completedAt);
  const overdue = pending.filter(task => new Date(task.reminderAt) <= new Date());
  const today = tasks.filter(task => isToday(task.reminderAt));
  const upcoming = pending.find(task => new Date(task.reminderAt) > new Date());
  const filtered = tasks.filter(task => (filter === 'all' || filter === 'today' && isToday(task.reminderAt) || filter === 'pending' && !task.completedAt || filter === 'completed' && task.completedAt) && `${task.title} ${task.description}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const progress = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;
  const filters = [{ key: 'all', label: 'همهٔ تسک‌ها', icon: 'grid', count: tasks.length }, { key: 'today', label: 'برای امروز', icon: 'calendar', count: today.length }, { key: 'pending', label: 'در انتظار انجام', icon: 'clock', count: pending.length }, { key: 'completed', label: 'انجام‌شده‌ها', icon: 'check', count: done.length }];

  return <div className="app-shell">
    <aside className="sidebar">
      <Brand />
      <div className="workspace-label">فضای شخصی <span>شخصی</span></div>
      <nav aria-label="فیلتر تسک‌ها">{filters.map(item => <button key={item.key} className={`nav-item ${view === 'tasks' && filter === item.key ? 'selected' : ''}`} onClick={() => { setView('tasks'); setFilter(item.key); }} aria-current={view === 'tasks' && filter === item.key ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span><b>{fa.format(item.count)}</b></button>)}</nav>
      <div className="sidebar-tip"><span className="tip-icon"><Icon name="leaf" size={23} /></span><h3>کم، ولی پیوسته.</h3><p>لازم نیست همه‌چیز را امروز تمام کنی. فقط قدم بعدی را بردار.</p><span className="tip-decoration" aria-hidden="true">✦</span></div>
      <button className={`profile profile-link ${view === 'profile' ? 'profile-selected' : ''}`} aria-label="پروفایل من" onClick={() => setView('profile')}><span className="avatar">{user.username[0].toUpperCase()}</span><span><strong><bdi>{user.username}</bdi></strong><small>پروفایل و تنظیمات ایمیل</small></span><Icon name="user" size={17} /></button>
    </aside>

    <div className="page">
      <header className="topbar"><div className="breadcrumb">فضای شخصی <span>/</span><strong>{view === 'profile' ? 'پروفایل من' : filters.find(item => item.key === filter).label}</strong></div><div className="topbar-actions"><div className="today-date"><Icon name="calendar" size={17} />{dayFormat.format(new Date())}</div><button className="topbar-profile" aria-label="باز کردن پروفایل" onClick={() => setView('profile')}><Icon name="user" size={17} /><bdi>{user.username}</bdi></button></div></header>
      <main>
        {view === 'profile' ? <ProfilePage user={user} onUserChange={updated => { revision.current++; onUserChange(updated); setTasks(current => current.map(task => task.reminderSentAt ? task : { ...task, recipient: updated.reminderEmail })); }} onLogout={onLogout} onBack={() => { setView('tasks'); refresh(); }} /> : <>
        <section className="page-heading"><div><div className="eyebrow"><span className="little-line" />هر روز، یک شروع تازه</div><h1>ذهنت رو سبک کن<span className="heading-dot">.</span></h1><p>کارها رو اینجا بنویس، یادآوری‌شون با ما.</p></div><button className="primary add-task" onClick={() => setModal({})}><Icon name="plus" />تسک جدید</button></section>

        <section className="stats" aria-label="آمار تسک‌ها">
          {[{ label: 'کارهای امروز', value: today.length, icon: 'calendar', color: 'blue', caption: 'یک روز، چند قدم کوچک' }, { label: 'در انتظار انجام', value: pending.length, icon: 'clock', color: 'amber', caption: overdue.length ? `${fa.format(overdue.length)} تسک از زمانش گذشته` : 'همه‌چیز طبق برنامه' }, { label: 'انجام‌شده', value: done.length, icon: 'check', color: 'green', caption: 'هر تیک، یک قدم جلوتر' }].map(stat => <div className="stat-card" key={stat.label}><div className={`stat-icon ${stat.color}`}><Icon name={stat.icon} size={23} /></div><div><span>{stat.label}</span><strong>{loading ? '—' : fa.format(stat.value)}</strong><small>{stat.caption}</small></div></div>)}
        </section>

        {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={refresh} className="text-button">تلاش دوباره</button></div>}
        <div className="content-grid">
          <section className="tasks-panel" aria-labelledby="tasks-title">
            <div className="panel-heading"><h2 id="tasks-title">تسک‌های من <span>{fa.format(filtered.length)}</span></h2><div className="search-field"><Icon name="search" size={17} /><input aria-label="جست‌وجوی تسک‌ها" placeholder="جست‌وجو در تسک‌ها…" value={search} onChange={event => setSearch(event.target.value)} /></div></div>
            <div className="tabs" aria-label="نمایش تسک‌ها">{filters.filter(item => item.key !== 'today').map(item => <button key={item.key} className={filter === item.key ? 'active' : ''} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}{filter === 'today' && <span className="today-filter">برای امروز</span>}</div>
            {loading ? <div className="empty-state" role="status"><div className="loading-ring" />در حال دریافت تسک‌ها…</div> : filtered.length ? <div className="task-list">{filtered.map(task => {
              const late = !task.completedAt && new Date(task.reminderAt) <= new Date();
              return <article className={`task-card ${task.completedAt ? 'is-done' : ''}`} key={task.id}>
                <button className="task-checkbox" role="checkbox" aria-checked={Boolean(task.completedAt)} aria-label={`${task.completedAt ? 'بازگرداندن' : 'انجام شد'}: ${task.title}`} disabled={Boolean(busy)} onClick={() => act(`/tasks/${task.id}/completion`, 'PATCH', { completed: !task.completedAt }, task.completedAt ? 'تسک به لیست کارها برگشت.' : 'آفرین! یک قدم جلوتر رفتی.')} >{task.completedAt && <Icon name="check" size={16} />}</button>
                <div className="task-body"><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className="task-meta"><span className={late ? 'overdue' : ''}><Icon name="clock" size={14} />{dateFormat.format(new Date(task.reminderAt))}</span><span className={`delivery-label ${task.reminderFailed && !task.completedAt ? 'overdue' : ''}`}><Icon name="mail" size={14} />{task.completedAt ? 'انجام شده' : task.reminderSentAt ? 'یادآوری ارسال شد' : task.reminderFailed ? 'ارسال ناموفق' : task.retrying ? 'در حال تلاش مجدد' : 'یادآوری ایمیلی'}</span></div><span className="recipient" dir="ltr">{task.recipient}</span>{task.reminderFailed && !task.completedAt && <button className="text-button retry-button" disabled={Boolean(busy)} onClick={() => act(`/tasks/${task.id}/retry`, 'POST', {}, 'یادآوری دوباره در صف قرار گرفت.')}>تلاش دوباره برای ارسال</button>}</div>
                <div className="task-actions"><button className="icon-button" aria-label={`ویرایش ${task.title}`} disabled={Boolean(busy)} onClick={() => setModal(task)}><Icon name="edit" size={17} /></button><button className="icon-button delete-button" aria-label={`حذف ${task.title}`} disabled={Boolean(busy)} onClick={() => { if (window.confirm(`«${task.title}» حذف شود؟`)) act(`/tasks/${task.id}`, 'DELETE', undefined, 'تسک حذف شد.'); }}><Icon name="trash" size={17} /></button></div>
              </article>;
            })}</div> : <div className="empty-state"><div className="empty-art" aria-hidden="true"><div className="paper"><span /><span /><span /><i><Icon name="check" size={23} /></i></div><span className="spark spark-one">✦</span><span className="spark spark-two">✧</span></div><h3>{search ? 'چیزی با این نام پیدا نشد' : tasks.length ? 'اینجا فعلاً کاری نیست' : 'از یک کار کوچک شروع کن'}</h3><p>{search ? 'یک عبارت دیگر را امتحان کن.' : tasks.length ? 'تسک‌های دیگر را در «همهٔ تسک‌ها» ببین.' : 'اولین تسکت رو بنویس و یک زمان براش بذار.\nما حواسمون به یادآوریش هست.'}</p>{!search && !tasks.length && <button className="secondary first-task" onClick={() => setModal({})}><Icon name="plus" size={18} />افزودن اولین تسک</button>}</div>}
            <div className="list-footer"><Icon name="check" size={15} /><span>انجامش دادی؟ تیکش رو بزن تا خیالت راحت بشه.</span></div>
          </section>

          <aside className="insights">
            <section className="progress-card"><div className="card-heading"><h2>قدم‌های تو</h2><Icon name="leaf" size={19} /></div><div className="progress-circle" role="progressbar" aria-label="درصد تسک‌های انجام‌شده" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{ '--progress': `${progress}%` }}><div><strong>{fa.format(progress)}<span>٪</span></strong><small>انجام شده</small></div></div><p>{done.length ? 'همین قدم‌های کوچک، روزت رو می‌سازن.' : 'اولین تیک، شروع یک حس خوبه.'}</p><div className="progress-count"><span><b>{fa.format(done.length)}</b> انجام‌شده</span><span>از <b>{fa.format(tasks.length)}</b> تسک</span></div></section>
            <section className="next-card"><span className="eyebrow"><Icon name="bell" size={16} />یادآوری بعدی</span><h3>{upcoming ? upcoming.title : 'جا برای یک برنامهٔ تازه'}</h3><p>{upcoming ? dateFormat.format(new Date(upcoming.reminderAt)) : 'برای کار بعدیت یک زمان مشخص کن.'}</p><button className="text-button" onClick={() => setModal(upcoming || {})}>{upcoming ? 'دیدن تسک' : 'برنامه‌ریزی کن'}<Icon name="arrow" size={16} /></button></section>
            <section className="mail-status"><div className={`status-icon ${config?.workerOnline ? 'online' : ''}`}><Icon name="mail" size={20} /></div><div><strong>{!config ? 'در حال بررسی سرویس…' : config.workerOnline ? 'یادآورها بیدارن' : 'پردازشگر در دسترس نیست'}</strong><p>{config?.mailMode === 'local' ? 'حالت آزمایشی؛ ایمیل‌ها در صندوق محلی Mailpit نمایش داده می‌شوند.' : config ? 'یادآوری‌ها به ایمیل انتخاب‌شده در پروفایل ارسال می‌شوند.' : 'وضعیت ارسال پس از اتصال نمایش داده می‌شود.'}</p></div></section>
          </aside>
        </div>
        </>}
        <footer className="page-footer"><span>با خیال سبک‌تر، ادامه بده.</span><span><span className="online-dot" />زمان‌ها به وقت <bdi>{timezone}</bdi></span></footer>
      </main>
    </div>
    {modal && <TaskForm task={modal.id ? modal : null} reminderEmail={user.reminderEmail} onClose={() => setModal(null)} onSave={data => mutate(modal.id ? `/tasks/${modal.id}` : '/tasks', modal.id ? 'PUT' : 'POST', data, modal.id ? 'تغییرات ذخیره شد.' : 'تسک جدیدت ثبت شد.')} />}
    {notice && <div className="toast" role="status"><Icon name="check" size={18} />{notice}</div>}
  </div>;
}
