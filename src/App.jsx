import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, RotateCw, Download, LogOut, Lock } from 'lucide-react';

export default function App() {
  return <LunchRegistrationApp />;
}

function LunchRegistrationApp() {
  import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, RotateCw, Download, LogOut, Lock } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('signup');
  const [adminPin, setAdminPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    department: '',
    vegetarian: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [registrations, setRegistrations] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const pollIntervalRef = useRef(null);

  const ADMIN_PIN = '1234';
  const SUPABASE_URL = 'https://imdamexqcqyoibczikfv.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZGFtZXhxY3F5b2liY3ppa2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTc5NzQsImV4cCI6MjA4ODUzMzk3NH0.3AQIE89zyD0vWYoN9a4-nPnam4Y0u9UaNA5HjEjmL2w';

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const supabaseCall = async (endpoint, options = {}) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1${endpoint}`, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers },
      });

      if (!response.ok) {
        throw new Error(`Supabase error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Supabase call failed:', err);
      throw err;
    }
  };

  const fetchTodayRegistrations = async () => {
    try {
      const today = getTodayDate();
      const data = await supabaseCall(
        `/registrations?date=eq.${today}&order=created_at.desc`,
        { method: 'GET' }
      );
      setRegistrations(data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    }
  };

  const addRegistration = async (registration) => {
    try {
      const today = getTodayDate();
      const newReg = {
        ...registration,
        date: today,
        created_at: new Date().toISOString(),
      };

      const data = await supabaseCall('/registrations', {
        method: 'POST',
        body: JSON.stringify(newReg),
      });

      return data;
    } catch (err) {
      console.error('Failed to add registration:', err);
      throw err;
    }
  };

  const checkDuplicateSignup = async (name) => {
    try {
      const today = getTodayDate();
      const data = await supabaseCall(
        `/registrations?date=eq.${today}&name=ilike.${name}`,
        { method: 'GET' }
      );
      return data && data.length > 0;
    } catch (err) {
      console.error('Failed to check duplicate:', err);
      return false;
    }
  };

  const resetRegistrations = async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      await supabaseCall(`/registrations?date=eq.${yesterdayDate}`, {
        method: 'DELETE',
      });

      setRegistrations([]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to reset registrations:', err);
    }
  };

  const handleSignupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.department.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const isDuplicate = await checkDuplicateSignup(formData.name);
      if (isDuplicate) {
        setError(`You've already registered for lunch today, ${formData.name}!`);
        setLoading(false);
        return;
      }

      await addRegistration(formData);

      setSubmitted(true);
      setTimeout(() => {
        setFormData({ name: '', department: '', vegetarian: false });
        setSubmitted(false);
      }, 2500);
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setPinInput('');
      setPinError('');
      setCurrentView('admin');
      fetchTodayRegistrations();
      pollIntervalRef.current = setInterval(() => {
        fetchTodayRegistrations();
      }, 3000);
    } else {
      setPinError('Incorrect PIN. Try again.');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setCurrentView('signup');
    setPinInput('');
    setPinError('');
    setRegistrations([]);
  };

  const handleRefresh = async () => {
    setAdminLoading(true);
    await fetchTodayRegistrations();
    setAdminLoading(false);
  };

  const handleManualReset = async () => {
    if (window.confirm('Are you sure you want to reset today\'s registrations? This cannot be undone.')) {
      setAdminLoading(true);
      await resetRegistrations();
      setAdminLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Department', 'Diet', 'Time'].join(','),
      ...registrations.map((r) => {
        const time = new Date(r.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        return [r.name, r.department, r.vegetarian ? 'Vegetarian' : 'Regular', time].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunch-registration-${getTodayDate()}.csv`;
    a.click();
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // SIGNUP VIEW
  if (currentView === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 flex items-center justify-center p-4">
        <div className="fixed top-0 right-0 w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-20 -z-10"></div>
        <div className="fixed bottom-0 left-0 w-96 h-96 bg-green-200 rounded-full blur-3xl opacity-20 -z-10"></div>

        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-serif font-bold text-gray-900 mb-2">
              Lunch Today?
            </h1>
            <p className="text-lg text-gray-600">
              Let us know if you're joining for lunch
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8 backdrop-blur-sm border border-white/80">
            {submitted ? (
              <div className="text-center py-8 animate-fadeIn">
                <div className="mb-6 flex justify-center">
                  <CheckCircle2 className="w-16 h-16 text-green-600 animate-bounce" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                  You're registered!
                </h2>
                <p className="text-gray-600">
                  See you at lunch today, {formData.name}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
                    Your Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleSignupChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none bg-gray-50 text-gray-900 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-semibold text-gray-800 mb-2">
                    Department
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleSignupChange}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none bg-gray-50 text-gray-900 transition-colors"
                  >
                    <option value="">Select a department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      name="vegetarian"
                      checked={formData.vegetarian}
                      onChange={handleSignupChange}
                      className="sr-only"
                    />
                    <div
                      className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                        formData.vegetarian ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
                          formData.vegetarian ? 'translate-x-6' : ''
                        }`}
                      ></div>
                    </div>
                    <span className="ml-3 text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                      Vegetarian / Special Diet
                    </span>
                  </label>
                  <p className="text-xs text-gray-600 mt-2 ml-17">
                    {formData.vegetarian ? '🥬 Vegetarian option selected' : 'Select if you need a vegetarian meal'}
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-shake">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-lg font-semibold text-white text-lg transition-all duration-300 transform ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-lg hover:scale-105 active:scale-95'
                  }`}
                >
                  {loading ? 'Registering...' : 'Register for Lunch'}
                </button>

                <p className="text-center text-xs text-gray-500 mt-4">
                  Registration valid for today only
                </p>

                <button
                  type="button"
                  onClick={() => setCurrentView('pin')}
                  className="w-full py-2 rounded-lg font-semibold text-gray-700 text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Admin Dashboard
                </button>
              </form>
            )}
          </div>

          <div className="mt-8 text-center text-sm text-gray-600">
            <p>Questions? Contact the kitchen at <span className="font-semibold">kitchen@company.com</span></p>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          .animate-bounce { animation: bounce 1s infinite; }
          .animate-shake { animation: shake 0.4s ease-in-out; }
        `}</style>
      </div>
    );
  }

  // PIN VIEW
  if (currentView === 'pin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <Lock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-3xl font-serif font-bold text-white mb-2">
              Admin Access
            </h1>
            <p className="text-slate-400">
              Enter the PIN to access the dashboard
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-6 bg-slate-800 rounded-2xl p-8 border border-slate-700">
            <div>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="Enter PIN"
                className="w-full px-4 py-4 rounded-lg border-2 border-slate-600 focus:border-orange-500 focus:outline-none bg-slate-700 text-white text-center text-2xl tracking-widest transition-colors"
                autoFocus
              />
            </div>

            {pinError && (
              <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-400">{pinError}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-lg font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-lg transition-all"
            >
              Unlock Dashboard
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView('signup');
                setPinInput('');
                setPinError('');
              }}
              className="w-full py-2 rounded-lg font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Back to Signup
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  if (currentView === 'admin') {
    const totalCount = registrations.length;
    const vegetarianCount = registrations.filter((r) => r.vegetarian).length;
    const regularCount = totalCount - vegetarianCount;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="fixed top-0 left-0 w-96 h-96 bg-green-700 rounded-full blur-3xl opacity-10 -z-10"></div>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-4xl font-serif font-bold text-white mb-2">
                Lunch Registration
              </h1>
              <p className="text-slate-400">
                Today's headcount • Last updated {lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleRefresh}
                disabled={adminLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  adminLoading
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg'
                }`}
              >
                <RotateCw className={`w-4 h-4 ${adminLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-slate-700 hover:bg-slate-600 text-white transition-all hover:shadow-lg"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-sm font-semibold text-orange-100 mb-2">Total Registered</p>
              <p className="text-4xl font-bold">{totalCount}</p>
              <p className="text-xs text-orange-100 mt-2">people for lunch today</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-sm font-semibold text-blue-100 mb-2">Regular Meals</p>
              <p className="text-4xl font-bold">{regularCount}</p>
              <p className="text-xs text-blue-100 mt-2">standard portions needed</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-sm font-semibold text-green-100 mb-2">Vegetarian Meals</p>
              <p className="text-4xl font-bold">{vegetarianCount}</p>
              <p className="text-xs text-green-100 mt-2">vegetarian options needed</p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="bg-slate-900 border-b border-slate-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Registered Participants</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700 text-slate-300 text-sm font-semibold">
                    <th className="px-6 py-4 text-left">#</th>
                    <th className="px-6 py-4 text-left">Name</th>
                    <th className="px-6 py-4 text-left">Department</th>
                    <th className="px-6 py-4 text-center">Diet</th>
                    <th className="px-6 py-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {registrations.map((registration, index) => (
                    <tr
                      key={registration.id}
                      className="text-slate-100 hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">{registration.name}</td>
                      <td className="px-6 py-4 text-slate-400">{registration.department}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            registration.vegetarian
                              ? 'bg-green-900/40 text-green-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {registration.vegetarian ? '🥬 Veg' : 'Regular'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-400">
                        {new Date(registration.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {registrations.length === 0 && (
              <div className="px-6 py-12 text-center text-slate-400">
                <p className="text-lg">No registrations yet</p>
                <p className="text-sm">Come back later to see who's signed up</p>
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-slate-500 text-sm">
            <p>Kitchen Dashboard • Data syncs every 3 seconds • PIN: {ADMIN_PIN}</p>
          </div>
        </div>

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }
}
}
