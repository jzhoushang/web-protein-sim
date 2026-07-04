# Protein Simulator on the Web

A simplified coarse-grained protein simulator for the web made using Three.js.

## Protein Generation

In this simulation, amino acids are represented as point masses and sorted into four categories with the most important information about them:

- Hydrophobic, neutral (green)
- Hydrophilic, neutral (white)
- Hydrophilic, positively charged at +1 e (red)
- Hydrophilic, negatively charged at -1 e (blue)

A peptide of 400 amino acids is randomly generated and then placed using a random walk.

### Random amino acid generator

The random number function $X:\mathbb{N}\to[0,1)$ is constructed given three $n$-tuples of numbers and a number $L\in\mathbb{R}$,

- $(A_1,\ldots,A_n)$. Starting with a tuple of numbers $(a_n)$ chosen uniformly on the range $[0,1)$, $A_i=\frac{a_i}{2\sum_j^n a_j}$.
- $(T_1,\ldots,T_n)$ chosen uniformly on the range $[0,L)$.
- $(\phi_1,\ldots,\phi_n)$ chosen uniformly on the range $[0,L)$.

The function $X(i)$ is then,

$
X(i)=\frac{1}{2}+\sum_{j=1}^{n}A_j\sin(\frac{2\pi}{T_j}i+\phi_j)
$

For the $i$-th amino acid, a uniformly generated random number $x_i$ is then compared to $X(i)$. If $x_i<X(i)$, the amino acid is hydrophobic. The remaining hydrophilic amino acids are uniformly distributed between positively, neutrally, and negatively charged.

This choice of random function creates a semi-periodic protein which contains hydrophobic and hydrophilic regions at pseudo-random intervals, mimicking common protein structures.

In the present work, $n=3$ and $L=128$.

### Random walk

The random walk relies on a parameter $d$ corresponding to the "disorderliness" of the protein and $r$ corresponding to the ideal bond length between two amino acids.

Starting from the initial conditions of $x_0=(0,0,0)$ and $\Delta x_0$ as a uniformly chosen point on the unit sphere, the next position can be found with $y$ as a list of uniformly chosen points on the unit sphere,

$x_{n+1}=x_n+r\Delta x_n$

$\Delta x_{n+1}=\frac{\Delta x_n + y}{\lVert \Delta x_n+y_n \rVert}$

In the present work, $d=3$ and $r=3.8$.

## Forces

In this simulation, there are seven forces:

1. Covalent bond force, modeled as a spring between each amino acid $i$ and $i+1$.
2. Angle constraint force, modeled as a spring between each amino acid $i$ and $i+2$.
3. Dihedral constraint force, modeled as a spring between each amino acid $i$ and $i+3$.
4. Hydrogen bond force, modeled as a spring between each amino acid $i$ and $i+4$.
5. Collision force, modeled as a spring between any amino acids within each other $r_{min}$ (a value that increases between amino acids $i$ and $j$ if $j>i+4$).
6. Electrostatic force.
7. Hydrophobic interaction force, modeled as an attraction between hydrophobic amino acids and a repulsion between hydrophilic and hydrophilic amino acids. This choice matches the behavior of a protein in water or a similar polar medium.

The angle constraint, dihedral constraint, and hydrogen bond forces create $\alpha$-helices in the protein structure and force it into positions mimicking real proteins.

### Hydrophobic interaction force

Given an energy depth $E$, a distance parameter $\sigma$, and an ideal bond length $r$, the magnitude of the hydrophobic interaction force between two amino acids at a distance $d$,

$x=\frac{d-r}{\sigma}$

$F=\frac{Ex}{1+x^2}$

The direction of this force is determined by the hydrophobicity of the two amino acids.

In the present work, $E=0.15$, $\sigma=1$, and $r=3.8$.

## Simulation

### Units

The units used in the simulation are Angstrom, mdyn, 100 kg, s (although the simulation is sped up so each second which passes in real life is approximately $2.5\times10^{-13}$ s in the simulation), and the electron volt e.

### Constants

In the simulation, a few values are derived from real constants. Those are,

- The mass of an amino acid $m_a=1.83\times10^{-27}\times100$ kg, using an approximation for the average mass of an amino acid (~110 Daltons).
- The ideal bond length $r=3.8$ Angstrom, using an approximation for the length a (straight) peptide chain grows with each additional amino acid.
- Coulomb's constant $k_c=2.307$ mdyn $\times$ Angstrom $^2\times$ e $^{-2}$.

Other constraints (the energy depth, the spring constant for the various spring-like collision forces, etc.) were chosen so that most amino acid arrangements would result protein-like structures. Exact values for these can be found in the source code, but they do not correspond to any real constants.

### Running the simulation

The simulation can be seen by executing the Python script [server.py](/server.py) and accessing on `localhost:{PORT}`. The constant `PORT` can be changed within the Python script.

The camera can be swiveled using the left mouse button, zoomed using the scroll wheel, and the focal point can be changed using the right mouse button. By default, the camera will be focused on the center of the protein and rotate around it.
