# Sandbox on Daytona

The new `Sandbox` API uses a required Convex component and a separately deployed
Node service backed by Daytona. The existing `RemoteRunner` API remains available
for migration. Provider keys belong only to the service; application deployments
hold a tenant-scoped service token.

Implementation contract:

- Logical workspace and run IDs are allocated transactionally in the component.
- Submission keys are scoped to the component. Retransmitting a submission returns
  the same run; an explicit retry uses a new key.
- The service persists intent before contacting Daytona and reconciles background
  work after restart. Remote commands use a per-run filesystem lock to prevent
  duplicate execution after an uncertain submission response.
- Full logs stay in Daytona; only bounded previews cross into Convex.
- Cancellation is a request until process termination is observed.
- Artifacts are explicitly exported to component-owned storage before temporary
  workspace cleanup. Artifact expiry is independent of workspace expiry.
- App wrappers authorize operations. Neither logical IDs nor download URLs are
  permission checks.

The supplied Durable Task Protocol is implemented by `taskStart/taskCancel` and
the transactional callback dispatcher. Task builders resolve function handles
asynchronously. Still requiring external integration: Convex billing integration,
production service tenancy/provisioning credentials,
or method/path enforcement by Daytona's host-only secret proxy. These require
an explicit integration contract; do not describe them as completed by an API
wrapper or a local demonstration.
