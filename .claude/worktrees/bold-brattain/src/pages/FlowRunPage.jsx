/**
 * FlowRunPage — shareable page for running a flow with a dynamic input form.
 *
 * Route: /flows/:id/input
 * Protected (auth required) — but designed to be shared with team members
 * who don't need to see or edit the flow canvas.
 *
 * Shows the flow name, description, and a dynamically generated form
 * based on the flow's source nodes. Submit runs the flow and redirects
 * to the execution view.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import FlowRunnerForm from '@/components/flows/FlowRunnerForm';
import { Loader2, Workflow, ArrowLeft } from 'lucide-react';

export default function FlowRunPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);

  useEffect(() => {
    apiFetch(`/api/flows/${id}`).then(r => r.json()).then(data => {
      if (data?.flow) setFlow(data.flow);
      else setError('Flow not found');
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (inputValues) => {
    setRunning(true);
    setError(null);

    try {
      // Inject input values into the flow's source nodes before executing
      const data = await apiFetch(`/api/flows/${id}/execute-with-inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: inputValues }),
      }).then(r => r.json());

      if (data?.execution) {
        setExecutionResult(data.execution);
        // Redirect to the execution view after a brief moment
        setTimeout(() => {
          navigate(`/flows/${id}/run/${data.execution.id}`);
        }, 1000);
      } else {
        setError(data?.error || 'Failed to start flow');
        setRunning(false);
      }
    } catch (err) {
      setError(err.message);
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error && !flow) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <button onClick={() => navigate('/flows')} className="text-sm text-[#2C666E] hover:underline">Back to Flows</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-[#0f0f18]">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <button onClick={() => navigate(`/flows/${id}`)} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-200 text-sm mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to flow builder
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2C666E]/20 border border-[#2C666E]/30 flex items-center justify-center">
              <Workflow className="w-5 h-5 text-[#2C666E]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">{flow?.name || 'Run Flow'}</h1>
              {flow?.description && <p className="text-sm text-slate-500 mt-0.5">{flow.description}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {executionResult ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-slate-100 mb-1">Flow Started</h2>
            <p className="text-sm text-slate-400">Redirecting to execution view...</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-1">Flow Inputs</h2>
              <p className="text-sm text-slate-500">Fill in the required inputs below to run this flow.</p>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-900/20 border border-red-800/40 rounded-xl text-sm text-red-400">
                {error}
              </div>
            )}

            <FlowRunnerForm
              flow={flow}
              onSubmit={handleSubmit}
              loading={running}
              standalone
            />
          </>
        )}
      </div>
    </div>
  );
}
