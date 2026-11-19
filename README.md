# Anechoic_Phased_Array_Sar_Beamforming_Fullstack_Repo

Production service architecture and telemetry verification suite.

## Modules
- `anechoic_range_ui/src/contracts/planar_nf2ff_scanner_breaker_policy_definitions.ts` (887 lines)
- `anechoic_range_ui/src/contracts/stap_clutter_notch_telemetry_payload_contracts.ts` (887 lines)
- `anechoic_range_ui/src/simulators/monopulse_sum_delta_client_deterministic_twin.ts` (887 lines)
- `anechoic_range_ui/src/simulators/mutual_coupling_s_mat_harmonic_perturbation_synth.ts` (887 lines)
- `anechoic_range_ui/src/state/planar_nf2ff_scanner_use_spectral_diagnostics_hook.ts` (887 lines)
- `anechoic_range_ui/src/state/radome_aberration_lut_use_domain_estimator_hook.ts` (887 lines)
- `anechoic_range_ui/src/state/stap_clutter_notch_use_breaker_command_hook.ts` (887 lines)
- `anechoic_range_ui/src/transport/autofocus_pga_phase_resilient_stream_client.ts` (887 lines)
- `anechoic_range_ui/src/views/autofocus_pga_phase/PhaseGradientAutofocusConsoleView.tsx` (888 lines)
- `anechoic_range_ui/src/views/ca_os_cfar_detector/OsCfarThresholdConsoleView.tsx` (888 lines)
- `anechoic_range_ui/src/views/digital_ddc_jesd204c/DirectRfSubsamplingAdcConsoleView.tsx` (888 lines)
- `anechoic_range_ui/src/views/gan_tr_module_lattice/AesaTrLatticeConsoleView.tsx` (888 lines)

## Running Tests
```bash
pytest -v
python -m unittest discover -s tests
```
