@def title = "My Work | JaydevSR"
# Current Projects

I am currently working with the (1+1)D Lattice Schwinger model, which is a model of quantum electrodynamics in (1+1) dimensions. We are trying to map this fermionic model to a quantum many-body Hamiltonian which can be simulated on an analog quantum simulator. The goal is to propose an alternative non-perterbative approach to understand the dynamics of this model in the strong coupling regime and to study the phenomenon of string breaking, confinement and their respective quatum phase transitions experimentally.

**References**:
- A. Lerose, _Simulating Schwinger model dynamics with quasi-one-dimensional qubit arrays_, [arXiv:2409.14544](https://arxiv.org/abs/2409.14544) [quant-ph]
- J. Kogut and L. Susskind, _Hamiltonian formulation of Wilson’s lattice gauge theories_, [Phys. Rev. D 11, 395](https://link.aps.org/doi/10.1103/PhysRevD.11.395) (1975).


<!-- ------------------
      PUBLICATIONS SECTION
     ------------------ -->
# Publications/Preprints

- A. Prakash, **J. S. Rao**, S. A. Parameswaran, A. Lerose, _Interface phases and dynamics in two-dimensional quantum magnets: A" holographic" approach from universality to quantum simulation_, [arXiv:2608.12312](https://arxiv.org/abs/2608.12312) (2026).
  \abstract{We introduce a framework to classify quantum phases, phase transitions, and non-equilibrium dynamics of interfaces separating ordered bulk domains in 2D quantum magnets - equivalently, confining strings in dual lattice gauge theories - based on effective 1D Hamiltonians governing geometric fluctuations. Building on a "holographic" approach from [Phys. Rev. Lett. 129, 120601 (2022)], here reinterpreted as an exact bosonization, we uncover a rich quantum phase structure, with a variety of stiff and rough interface phases described by gapped and gapless 1D ground states, respectively, all distinguishable through the statistics of 2D wave-function snapshots. Our framework allows us to predict distinct spatiotemporal scaling laws for non-equilibrium curvature-driven interface dynamics across parameter space, which can be readily probed in existing experiments. We finally show that our approach enables the unprecedented experimental opportunity of directly measuring charge full counting statistics and symmetry-resolved properties of an encoded 1D system, as we explicitly demonstrate by numerically simulating a neutral-atom array experiment.}
  

- R. V. Gavai, B. Mohanty, **J. S. Rao**, S. Saha, _Finite-size behavior of higher-order cumulant ratios near criticality in two-dimensional Potts models_, [Journal of Physics G: Nuclear and Particle Physics, Volume 53, Number 4](https://iopscience.iop.org/article/10.1088/1361-6471/ae5fb6/meta) (2026).
  \abstract{Theoretical considerations predict a specific hierarchy among ratios of net-baryon number cumulants (χn, where n is the order of cumulant) in the vicinity of the transition from the low-temperature hadronic phase to the high temperature quark-gluon plasma phase at small baryon chemical potential, μB, in the QCD phase diagram. This hierarchy, χ6χ2<χ5χ1<χ4χ2<χ3χ1, has been observed by the STAR experiment in net-proton number (a proxy of net-baryon number) cumulant ratios over a broad range of collision energies. Motivated by these findings, we investigate whether similar ordering emerges generically in finite statistical systems undergoing second-order phase transitions. We employ two different spin models: the two-state and three-state Potts models in two dimensions, both exhibiting a transition from an ordered phase to a disordered phase at their respective critical temperatures. Monte Carlo simulations are performed on square lattices of varying sizes using the Wolff cluster algorithm. Cumulants of the total magnetization are calculated up to sixth order in both of these models in a temperature range near their corresponding critical temperatures. Higher-order cumulants exhibit extrema (peaks/troughs) whose magnitudes grow with both cumulant order and lattice size, reflecting enhanced critical fluctuations. Except within a narrow temperature window above the critical temperature, neither the complete hierarchy nor its exact reverse is realized over the studied temperature range in either model.}


<!-- ------------------
      PRE-PHD SECTION (collapsed by default)
     ------------------ -->
\begin{prephd}{title="Pre PhD"}

<!-- ------------------
      PROJECTS SECTION
     ------------------ -->
# Projects

- **\style{color:var(--grey-color-dark)}{Dynamics of quantum traverse field Ising model}** _(Supervised by Prof. Dr. Markus Heyl, Universität Augsburg, Germany)_.

  \abstract{In presence of long range interactions among the spins in a traverse-field Ising model, it is not possible to obtain a good analytic description of it's dynamical properties. We aim to use a perturbative renormalization group technique based on the strong-disorder renormalization group (SDRG) to obtain time evolution of spins and their correlators for this model. This has possible applications to understand the entanglement dynamics and glassy behaviour of systems of Rydberg atoms. This project was supported by funding from the DAAD-WISE scholarship programme.}

- **\style{color:var(--grey-color-dark)}{Higher order susceptibilities of the 2D 3-state Potts model}** _(Supervised by Prof. Rajiv V. Gavai, IISER Bhopal, India)_.

  \abstract{In search of the QCD critical point, higher order baryonic susceptibilities (or cumulants) play a vital role as indicators of crossovers and phase-transitions. In this project we studied such equivalent higher order magnetic susceptiblities for classical spin models, particularly the 2D 3-state Potts model. We obtained scaling exponents of such quantities using finite size scaling theory and performed numerical verification of these results with cluster based Monte-Carlo simulations. We also looked into the ratios of higher order susceptibilites near the second order critical point to gain some qualitative insights about their behavior in critical regions.}

- **\style{color:var(--grey-color-dark)}{Statistics of nearest neighbor distances of the 2D Ising and XY model}** _(Supervised by Prof. Dr. Markus Heyl, Universität Augsburg, Germany)_.

  \abstract{This was a remote project in which I got to learn about classical spin models and how to generate configurations of such models using Monte-Carlo simulations. I used the Wolff cluster algorithm to study the second order phase transition of the classical 2D Ising model and the Kosterlitz-Thouless transition in the classical 2D XY model. We were also trying to understand the statistics of nearest neighbor distances of the configurations of these models at different temperatures. We obtained some general probabilitic bounds for the averages of such nearest neighbor distances and tried to relate these to the global properties of these models at a particular temperature such as the structure factor.}

# Open Source Projects

- **\style{color:var(--grey-color-dark)}{Contributor to Molly.jl, an open-source molecular dynamics library in Julia}**. Some funded project that I have worked on for this library are:
  - *(May-September, 2023)* Improving performance on GPUs with improved kernels and neighbor lists. Funded by Julia Summer of Code 2023 with support from NumFOCUS.
  - *(June-September, 2022)* Implementation of Replica Exchange Molecular Dynamics (REMD) simulators. Funded by Google Summer of Code 2022.

<!-- ------------------
      TALKS SECTION
     ------------------ -->
# Talks, Presentations and Workshops

\style{color:gray}{<b>Legend</b>: {{special_icon "talk"}} = Talk, {{special_icon "presentation"}} = Presentation, {{special_icon "workshop"}} = Workshop}

## 2023
- {{special_icon "presentation"}}  *{{format_date 2023 3 25}}*,  **\style{color:var(--grey-color-dark)}{A closer look at the critical fluctuations of 3-state Potts model}** at \style{color: var(--grey-color-dark)}{In-house Physics Symposium}, Department of Physics, IISER, Bhopal, India.

- {{special_icon "workshop"}}  *{{format_date 2023 1 29}}*,  **\style{color:var(--grey-color-dark)}{Introduction to Git and GitHub for Project Management and Open Source Development}** at IISER, Bhopal, India. [[Material](https://github.com/JaydevSR/intro-git-github-iiserb)]

## 2022
- {{special_icon "talk"}}  *{{format_date 2022 10 30}}*, **\style{color:var(--grey-color-dark)}{What is GSoC all about? Plus, my project, experience and tips}** at [IISER Bhopal](https://www.iiserb.ac.in/), Bhopal, India. [[Material](https://github.com/JaydevSR/GSoC_Interaction_IISERB)]

\end{prephd}