# A service on Kubernetes with CI/CD, Terraform, Prometheus and Grafana

**Goal.** One of your services (the inference server by default) running on a Kubernetes cluster created by Terraform, deployed by a CI/CD pipeline on every merge to main, observed with Prometheus and Grafana, and updated by a rolling deploy that drops no requests under load.

**Why.** It takes a working service to production standards. It covers `inference-engineering/containerization`, `inference-engineering/kubernetes`, `inference-engineering/zero-downtime-deplo`, `inference-engineering/observability`, `software-architect/infrastructure-as-code`, `software-architect/ci-cd` and `software-architect/containers`, and builds Kubernetes, Terraform, CI/CD, Prometheus and Grafana.

**Scope.** MVP: a cluster (managed, such as GKE, EKS or DigitalOcean, or k3s on a VM), its registry and network from Terraform with remote state; a multi-stage image (a CPU build with a small model keeps the bill low); Deployment, Service and Ingress with readiness and liveness probes, resource requests and a PodDisruptionBudget; GitHub Actions that test, build, push and deploy; kube-prometheus-stack; a dashboard of the golden signals; a load test across a rolling deploy. Stretch: Helm or Kustomize overlays for staging, autoscaling on request rate, alerts, canary releases.

**Architecture.** Terraform creates the cluster and its supporting resources. A merge to main triggers CI: tests, an image tagged with the commit SHA, then a deploy that updates the Deployment. Kubernetes replaces pods one at a time and routes traffic only to pods whose readiness probe passes; a preStop hook and graceful shutdown drain in-flight requests. The service exposes `/metrics`, Prometheus scrapes it through a ServiceMonitor, and Grafana shows latency, traffic, errors and saturation.

```
merge ─▶ GitHub Actions: test ─▶ build ─▶ push ─▶ deploy
Terraform ─▶ cluster, registry, network
k6 ─▶ Ingress ─▶ Service ─▶ pods (readiness, preStop drain)
                                │ /metrics
                        Prometheus ─▶ Grafana
```

**Stack.** Terraform, a managed Kubernetes service or k3s, Docker, GitHub Actions with OIDC to the cloud, Helm or Kustomize, kube-prometheus-stack, the Prometheus Python client, k6 or Locust.

**Milestones.** Terraform for the cluster and registry, with one destroy and recreate (7 h) · production image and manifests with probes and drain (7 h) · CI/CD pipeline to the cluster (6 h) · metrics endpoint, Prometheus and the Grafana dashboard (7 h) · rolling deploy under load and its report (5 h) · README and runbook (3 h). Total 35 h.

**Done when.** `terraform destroy` then `terraform apply` rebuilds the environment from scratch, the pipeline redeploys onto it with no manual step, and this is done once and timed. Every merge to main builds, tests and deploys. The dashboard shows p50, p95 and p99 latency, error rate and saturation (CPU, memory, queue depth). A k6 run at a steady 50 requests per second across a rolling deploy of three replicas records zero failed requests.

**Measure and report.** Time to recreate the environment; pipeline time from merge to serving; latency percentiles before, during and after the deploy; failed request count; the monthly cost of the setup.

**Pitfalls.** A readiness probe that passes before the model is loaded, so traffic hits cold pods. No graceful shutdown, so pods die with requests in flight. Terraform state kept on a laptop. Long-lived cloud keys stored as CI secrets instead of OIDC. Forgetting to destroy the cluster and paying for it all month.

**References.** kubernetes-tutorials, terraform-tutorials, prometheus-docs, github-actions-docs, google-sre-book, m-inference-server, cert-ckad.

**Write-up.** An architecture diagram, a dashboard screenshot taken during the rollout, the load-test report showing zero failures, the recreate timing and monthly cost, and the runbook for a bad deploy.
