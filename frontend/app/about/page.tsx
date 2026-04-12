export default function AboutArchitecturePage() {
  return (
    <main className="space-y-6">
      <section className="glass-panel tech-frame rounded-[30px] p-6 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">About / Architecture</p>
        <h2 className="mt-3 text-3xl font-semibold text-white lg:text-4xl">AnomalyVision System Architecture</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300 lg:text-base">
          This page summarizes the real model architecture, pipeline, benchmark context, limitations, and forward roadmap for the anomaly detection system.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="glass-panel tech-frame rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">Model Name</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            AnomalyVision (Appearance and Motion Enhanced Masked Autoencoder) with CvT backbone and student-teacher reconstruction scoring.
          </p>
        </article>

        <article className="glass-panel tech-frame rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">Dataset Used</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Conceptually trained off surveillance benchmarks like the CUHK Avenue Dataset, extracting motion gradients and enforcing appearance validations.
          </p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2 mt-5">
        <article className="glass-panel tech-frame rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">Frontend Infrastructure</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Next.js 15 Application running strictly on Edge servers (Vercel) parsing video objects through client-side HTML5 canvas validations. 
          </p>
        </article>

        <article className="glass-panel tech-frame rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">Backend ML Engine</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
             Dockerized FastAPI execution node hosted on <b>Modal Serverless GPUs</b>, delivering dynamically scaled H200/T4 capability with exactly $0 resting costs.
          </p>
        </article>
      </section>

      <section className="glass-panel tech-frame rounded-[30px] p-6">
        <h3 className="text-2xl font-semibold text-white">Pipeline Overview</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-5">
          {[
            "Video Upload",
            "Frame Extraction",
            "Gradient Generation",
            "MAE Inference",
            "Spike and Interval Detection"
          ].map((step, idx) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">Step {idx + 1}</p>
              <p className="mt-2 text-sm font-medium text-white">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="glass-panel tech-frame rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">Evaluation Metrics</h3>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-200">
            <li>Micro AUC for frame-level anomaly ranking across all test videos.</li>
            <li>Macro AUC for per-video balanced performance assessment.</li>
            <li>Peak anomaly score and abnormal interval summaries for operational interpretation.</li>
            <li>Processing time and frame count for runtime profiling.</li>
          </ul>
        </article>

        <article className="glass-panel tech-frame rounded-[28px] p-6">
          <h3 className="text-2xl font-semibold text-white">Limitations</h3>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-200">
            <li>Best on static-camera surveillance style videos similar to Avenue scenes.</li>
            <li>Not object classification or semantic activity recognition.</li>
            <li>Batch inference path, not full realtime streaming in current implementation.</li>
            <li>Runtime telemetry in browser is approximate unless backend metric agents are added.</li>
          </ul>
        </article>
      </section>

      <section className="glass-panel tech-frame rounded-[30px] p-6">
        <h3 className="text-2xl font-semibold text-white">Future Scope</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            "Live camera stream backend integration",
            "Asynchronous long-video job queue",
            "Multi-camera session management",
            "Backend GPU and temperature telemetry"
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
