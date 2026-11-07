import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, 'data/subjects');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const subjectsDefinition = [
  // --- ENGINEERING (CS/IT) ---
  {
    name: 'Data Structures & Algorithms',
    slug: 'dsa',
    field: 'Engineering (CS/IT)',
    description: 'Core linear and non-linear structures, recursion, dynamic programming, and asymptotic complexity.',
    topics: [
      { name: 'Arrays & Strings', description: 'Two pointers, sliding window, prefix sums' },
      { name: 'Linked Lists', description: 'Cycle detection, reversals, merge lists' },
      { name: 'Trees & BST', description: 'DFS/BFS traversals, LCA, AVL balancing' },
      { name: 'Graphs & Shortest Paths', description: 'Dijkstra, Bellman-Ford, topological sort' },
      { name: 'Dynamic Programming', description: 'Memoization, tabulation, optimal substructure' }
    ],
    questions: [
      {
        prompt: 'Which data structure is most optimal to check for balanced brackets or parentheses in O(N) time?',
        topic: 'Arrays & Strings',
        options: ['Queue', 'Stack', 'Binary Search Tree', 'Hash Map'],
        correct_index: 1,
        explanation: 'A Stack follows Last-In-First-Out (LIFO), which matches the nesting order of opening and closing brackets.',
        difficulty: 'easy'
      },
      {
        prompt: 'In Floyd’s Cycle-Finding algorithm (tortoise and hare), how do the two pointers traverse a linked list?',
        topic: 'Linked Lists',
        options: ['Both advance 1 node at a time', 'Slow advances 1 node, fast advances 2 nodes', 'Fast advances from end to start', 'Slow advances 2 nodes, fast advances 3 nodes'],
        correct_index: 1,
        explanation: 'The slow pointer advances 1 step while the fast pointer advances 2 steps. If a cycle exists, they are guaranteed to meet inside the loop.',
        difficulty: 'medium'
      },
      {
        prompt: 'What is the in-order traversal of a valid Binary Search Tree (BST) guaranteed to produce?',
        topic: 'Trees & BST',
        options: ['Reverse sorted order', 'Values in non-decreasing sorted order', 'Values grouped by depth', 'A min-heap representation'],
        correct_index: 1,
        explanation: 'In-order traversal visits (Left, Root, Right), which in a BST outputs keys in strictly ascending sorted order.',
        difficulty: 'easy'
      },
      {
        prompt: 'Which algorithm finds single-source shortest paths in a graph with non-negative edge weights in O((V + E) log V) time?',
        topic: 'Graphs & Shortest Paths',
        options: ['Floyd-Warshall', 'Breadth First Search', 'Dijkstra’s Algorithm with Min-Heap', 'Kruskal’s Algorithm'],
        correct_index: 2,
        explanation: 'Dijkstra’s algorithm using a priority queue/min-heap efficiently computes non-negative shortest paths in O((V+E) log V).',
        difficulty: 'medium'
      },
      {
        prompt: 'What are the two foundational prerequisites for applying Dynamic Programming to an optimization problem?',
        topic: 'Dynamic Programming',
        options: ['Greedy choice & sorted inputs', 'Overlapping subproblems & optimal substructure', 'Bipartite graph & tree depth', 'Linear time & constant space'],
        correct_index: 1,
        explanation: 'Dynamic Programming applies when a problem exhibits optimal substructure and overlapping subproblems that can be cached.',
        difficulty: 'hard'
      }
    ]
  },
  {
    name: 'Python',
    slug: 'python',
    field: 'Engineering (CS/IT)',
    description: 'Modern Python idioms, OOP, generators, decorators, memory management, and GIL.',
    topics: [
      { name: 'Data Types & Comprehensions', description: 'Lists, dicts, sets, generator expressions' },
      { name: 'Functions & Decorators', description: 'Higher-order functions, *args/**kwargs, closures' },
      { name: 'OOP & Dunder Methods', description: 'Classes, inheritance, __repr__, __call__' },
      { name: 'Generators & Iterators', description: 'yield, next(), iter(), memory-efficient streams' },
      { name: 'Concurrency & GIL', description: 'Threading, multiprocessing, asyncio, GIL locks' }
    ],
    questions: [
      {
        prompt: 'What is the key advantage of a generator expression over a list comprehension in Python?',
        topic: 'Generators & Iterators',
        options: ['It executes in parallel across CPU cores', 'It produces values lazily on-demand without loading the whole list into memory', 'It automatically compiles to C', 'It allows modifying immutable tuples'],
        correct_index: 1,
        explanation: 'Generators evaluate items lazily via the iterator protocol, conserving RAM when handling massive or infinite sequences.',
        difficulty: 'medium'
      },
      {
        prompt: 'In Python, what is the default behavior when passing a mutable object (like a list) as a default parameter value in a function definition?',
        topic: 'Functions & Decorators',
        options: ['A new list is created on every call', 'The same list object is shared across subsequent calls', 'Python raises a TypeError at parse time', 'The list becomes an immutable tuple'],
        correct_index: 1,
        explanation: 'Default argument expressions in Python are evaluated once when the function definition is executed, leading to a persistent shared object.',
        difficulty: 'medium'
      },
      {
        prompt: 'What does the Global Interpreter Lock (GIL) in CPython prevent?',
        topic: 'Concurrency & GIL',
        options: ['Multiple threads from executing Python bytecode simultaneously on separate cores', 'Multiple processes from sharing disk files', 'Garbage collection cycles', 'Asyncio coroutines from awaiting I/O'],
        correct_index: 0,
        explanation: 'The GIL ensures that only one native thread executes Python bytecode at any given moment, making CPU-bound multi-threading single-core in CPython.',
        difficulty: 'hard'
      }
    ]
  },
  {
    name: 'C Programming',
    slug: 'c-programming',
    field: 'Engineering (CS/IT)',
    description: 'Pointers, dynamic memory (malloc/free), structs, memory layouts, and bitwise operations.',
    topics: [
      { name: 'Pointers & Pointer Arithmetic', description: 'Addresses, dereferencing, void pointers' },
      { name: 'Dynamic Memory Allocation', description: 'malloc, calloc, realloc, free, leaks' },
      { name: 'Structs & Unions', description: 'Padding, alignment, typedefs' },
      { name: 'Bitwise Manipulation', description: 'Shifts, masks, bit flags' },
      { name: 'Preprocessors & Compilation', description: 'Macros, header guards, linking' }
    ],
    questions: [
      {
        prompt: 'What happens if you fail to call free() on memory allocated via malloc() before the pointer goes out of scope?',
        topic: 'Dynamic Memory Allocation',
        options: ['Segmentation fault immediately occurs', 'Memory leak occurs as heap bytes remain allocated', 'The OS automatically garbage collects it immediately', 'The stack overflows'],
        correct_index: 1,
        explanation: 'C lacks automatic garbage collection. Unfreed heap allocations remain reserved until process exit, causing a memory leak.',
        difficulty: 'easy'
      },
      {
        prompt: 'If `int *ptr = arr;` where `arr` is an integer array, what does `*(ptr + 2)` evaluate to?',
        topic: 'Pointers & Pointer Arithmetic',
        options: ['The value at `arr[2]`', 'The memory address shifted by 2 bits', 'The value at `arr[0] + 2`', 'A null pointer'],
        correct_index: 0,
        explanation: 'Pointer arithmetic scales the offset by `sizeof(int)`. Dereferencing `*(ptr + 2)` is semantically identical to `arr[2]`.',
        difficulty: 'medium'
      }
    ]
  },
  {
    name: 'Java',
    slug: 'java',
    field: 'Engineering (CS/IT)',
    description: 'Core Java, JVM architecture, Collections Framework, Multithreading, and Garbage Collection.',
    topics: [
      { name: 'OOP & Interfaces', description: 'Polymorphism, abstraction, default methods' },
      { name: 'Collections Framework', description: 'ArrayList, HashMap, TreeMap, concurrent sets' },
      { name: 'JVM & Memory Management', description: 'Heap, Stack, Metaspace, GC algorithms' },
      { name: 'Exception Handling', description: 'Checked vs unchecked exceptions, try-with-resources' },
      { name: 'Streams & Lambdas', description: 'Functional interfaces, map/filter/reduce' }
    ],
    questions: [
      {
        prompt: 'Why should you override `hashCode()` whenever you override `equals()` in a Java class?',
        topic: 'Collections Framework',
        options: ['To allow the JVM to serialize the object', 'To ensure equal objects produce identical hash codes when used in hash-based collections like HashMap', 'To speed up garbage collection', 'To allow polymorphism in subclasses'],
        correct_index: 1,
        explanation: 'The contract of hashCode states that if two objects are equal according to equals(), they must produce the same hashCode.',
        difficulty: 'medium'
      },
      {
        prompt: 'Where are local primitive variables stored during method execution in Java?',
        topic: 'JVM & Memory Management',
        options: ['Heap memory', 'Call Stack frame', 'Metaspace', 'Eden space'],
        correct_index: 1,
        explanation: 'Local primitive variables and object reference variables are allocated directly on the thread’s call stack frame.',
        difficulty: 'easy'
      }
    ]
  },
  {
    name: 'DBMS',
    slug: 'dbms',
    field: 'Engineering (CS/IT)',
    description: 'Relational algebra, SQL, normalization (1NF-BCNF), ACID properties, and indexing.',
    topics: [
      { name: 'Relational Modeling & SQL', description: 'DDL, DML, Joins, Aggregations, Subqueries' },
      { name: 'Normalization', description: '1NF, 2NF, 3NF, BCNF, functional dependencies' },
      { name: 'Transactions & ACID', description: 'Atomicity, Consistency, Isolation, Durability' },
      { name: 'Indexing & B-Trees', description: 'Clustered vs non-clustered, B+ Trees' },
      { name: 'Concurrency Control', description: '2-Phase Locking, deadlocks, MVCC' }
    ],
    questions: [
      {
        prompt: 'Which normal form eliminates transitive functional dependencies for non-prime attributes?',
        topic: 'Normalization',
        options: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'],
        correct_index: 2,
        explanation: '3NF requires 2NF and mandates that no non-prime attribute is transitively dependent on the primary key.',
        difficulty: 'medium'
      },
      {
        prompt: 'In database transaction management, what does the "Isolation" property guarantee?',
        topic: 'Transactions & ACID',
        options: ['Data survives sudden power failure', 'Concurrent transactions execute without uncommitted interference', 'Database constraints are always valid', 'All-or-nothing execution'],
        correct_index: 1,
        explanation: 'Isolation ensures concurrent execution leaves the database in the same state as if transactions ran serially.',
        difficulty: 'medium'
      }
    ]
  },
  {
    name: 'Operating Systems',
    slug: 'os',
    field: 'Engineering (CS/IT)',
    description: 'Process management, CPU scheduling, synchronization, virtual memory, and file systems.',
    topics: [
      { name: 'Processes & Threads', description: 'PCB, context switching, fork/exec, IPC' },
      { name: 'CPU Scheduling', description: 'Round Robin, SJF, Multilevel feedback queues' },
      { name: 'Process Synchronization', description: 'Mutexes, semaphores, monitors, deadlock conditions' },
      { name: 'Virtual Memory & Paging', description: 'Page tables, TLB, page faults, LRU replacement' },
      { name: 'Storage & File Systems', description: 'Inodes, directory structures, journaling' }
    ],
    questions: [
      {
        prompt: 'Which condition is NOT one of Coffman’s four necessary conditions for deadlock to occur?',
        topic: 'Process Synchronization',
        options: ['Mutual Exclusion', 'Hold and Wait', 'Preemption Allowed', 'Circular Wait'],
        correct_index: 2,
        explanation: 'Deadlock requires NO preemption (resources cannot be forcibly reclaimed). If preemption is allowed, deadlock cannot occur.',
        difficulty: 'medium'
      },
      {
        prompt: 'What hardware component accelerates virtual-to-physical address translation in modern CPUs?',
        topic: 'Virtual Memory & Paging',
        options: ['Translation Lookaside Buffer (TLB)', 'Direct Memory Access (DMA)', 'Arithmetic Logic Unit (ALU)', 'Instruction Register'],
        correct_index: 0,
        explanation: 'The TLB is a high-speed hardware cache of recent virtual-to-physical page translations.',
        difficulty: 'medium'
      }
    ]
  },
  {
    name: 'Computer Networks',
    slug: 'networks',
    field: 'Engineering (CS/IT)',
    description: 'OSI and TCP/IP stack, routing protocols, flow & congestion control, DNS, and TLS/HTTPS.',
    topics: [
      { name: 'Network Models (OSI / TCP/IP)', description: 'Layers, encapsulation, packet headers' },
      { name: 'Transport Layer (TCP / UDP)', description: '3-way handshake, congestion control, windowing' },
      { name: 'Network Layer & Routing', description: 'IPv4/IPv6, subnetting, OSPF, BGP' },
      { name: 'Link Layer & MAC', description: 'Ethernet, ARP, collision domains, switches' },
      { name: 'Application Protocols', description: 'DNS, HTTP/2, HTTP/3, TLS/SSL' }
    ],
    questions: [
      {
        prompt: 'During the TCP 3-way handshake, which flags are exchanged between client and server?',
        topic: 'Transport Layer (TCP / UDP)',
        options: ['SYN -> SYN-ACK -> ACK', 'ACK -> SYN -> FIN', 'RST -> SYN -> ACK', 'SYN -> ACK -> DATA'],
        correct_index: 0,
        explanation: 'The client sends SYN, the server replies with SYN-ACK, and the client acknowledges with ACK to establish a full-duplex connection.',
        difficulty: 'easy'
      },
      {
        prompt: 'Which protocol translates an IP address into a physical hardware MAC address on a local area network?',
        topic: 'Link Layer & MAC',
        options: ['DNS', 'ARP (Address Resolution Protocol)', 'DHCP', 'ICMP'],
        correct_index: 1,
        explanation: 'ARP broadcasts on the local network to discover the Layer 2 MAC address associated with a given Layer 3 IP address.',
        difficulty: 'easy'
      }
    ]
  },
  {
    name: 'Web Development',
    slug: 'web-dev',
    field: 'Engineering (CS/IT)',
    description: 'Modern front-end, DOM, browser rendering, REST/GraphQL APIs, authentication, and state.',
    topics: [
      { name: 'HTML5 & Semantic DOM', description: 'Semantic tags, accessibility, web storage' },
      { name: 'CSS & Modern Layouts', description: 'Flexbox, CSS Grid, animations, responsive design' },
      { name: 'JavaScript & Event Loop', description: 'Promises, async/await, microtasks, closures' },
      { name: 'Client-Side Frameworks', description: 'React component lifecycle, hooks, virtual DOM' },
      { name: 'Backend APIs & Security', description: 'REST, CORS, JWT, XSS, CSRF mitigation' }
    ],
    questions: [
      {
        prompt: 'In the JavaScript event loop, in what order do synchronous code, microtasks (Promises), and macrotasks (setTimeout) execute?',
        topic: 'JavaScript & Event Loop',
        options: ['Synchronous -> Macrotasks -> Microtasks', 'Synchronous -> Microtasks -> Macrotasks', 'Macrotasks -> Synchronous -> Microtasks', 'Microtasks -> Macrotasks -> Synchronous'],
        correct_index: 1,
        explanation: 'Synchronous execution finishes first, then the microtask queue (Promise callbacks) drains completely before the next macrotask is dequeued.',
        difficulty: 'medium'
      },
      {
        prompt: 'What security mechanism prevents a malicious website from executing unauthorized script requests against an authenticated API domain?',
        topic: 'Backend APIs & Security',
        options: ['Cross-Origin Resource Sharing (CORS) & SameSite cookies', 'DNS prefetching', 'Gzip compression', 'Service worker caching'],
        correct_index: 0,
        explanation: 'CORS policy and SameSite cookie attributes protect web endpoints from unauthorized cross-origin requests and CSRF attacks.',
        difficulty: 'medium'
      }
    ]
  },

  // --- ENGINEERING (CORE) ---
  {
    name: 'Engineering Mathematics',
    slug: 'eng-math',
    field: 'Engineering (Core)',
    description: 'Calculus, linear algebra, eigenvalues, differential equations, Fourier series, and Laplace transforms.',
    topics: [
      { name: 'Linear Algebra & Matrices', description: 'Rank, determinants, eigenvalues, diagonalization' },
      { name: 'Differential Calculus & PDEs', description: 'Partial derivatives, gradient, divergence, curl' },
      { name: 'Ordinary Differential Equations', description: 'First & second order ODEs, homogeneous solutions' },
      { name: 'Laplace & Fourier Transforms', description: 'Frequency domain analysis, transfer functions' },
      { name: 'Probability & Statistics', description: 'Normal distribution, hypothesis testing, Bayes theorem' }
    ],
    questions: [
      {
        prompt: 'What is the sum of the eigenvalues of any square matrix equal to?',
        topic: 'Linear Algebra & Matrices',
        options: ['The determinant of the matrix', 'The trace (sum of diagonal entries) of the matrix', 'Zero', 'The matrix rank'],
        correct_index: 1,
        explanation: 'A fundamental theorem of linear algebra proves that the sum of the eigenvalues equals the trace of the matrix.',
        difficulty: 'easy'
      },
      {
        prompt: 'What is the Laplace transform of the unit step function u(t)?',
        topic: 'Laplace & Fourier Transforms',
        options: ['1', '1 / s', '1 / s^2', 'e^(-s)'],
        correct_index: 1,
        explanation: 'The integral from 0 to infinity of e^(-st) * 1 dt evaluates to 1/s for s > 0.',
        difficulty: 'easy'
      }
    ]
  },
  {
    name: 'Engineering Physics',
    slug: 'eng-physics',
    field: 'Engineering (Core)',
    description: 'Wave optics, lasers, quantum mechanics basics, electromagnetic theory, and solid state physics.',
    topics: [
      { name: 'Wave Optics & Interference', description: 'Diffraction gratings, thin films, polarization' },
      { name: 'Lasers & Fiber Optics', description: 'Stimulated emission, optical fibers, numerical aperture' },
      { name: 'Quantum Mechanics Basics', description: 'De Broglie wavelength, wave-particle duality, uncertainty' },
      { name: 'Electromagnetism & Maxwell', description: 'Gauss, Faraday, Ampere laws, electromagnetic waves' },
      { name: 'Semiconductor Physics', description: 'Energy bands, Fermi level, p-n junctions' }
    ],
    questions: [
      {
        prompt: 'In optical fibers, what optical phenomenon guides light along the core without escaping into the cladding?',
        topic: 'Lasers & Fiber Optics',
        options: ['Diffraction', 'Total Internal Reflection', 'Brewster polarization', 'Double refraction'],
        correct_index: 1,
        explanation: 'When the angle of incidence in the core exceeds the critical angle relative to the lower-index cladding, total internal reflection traps the light wave.',
        difficulty: 'easy'
      },
      {
        prompt: 'According to Heisenberg’s Uncertainty Principle, which pair of variables cannot be simultaneously measured with arbitrary precision?',
        topic: 'Quantum Mechanics Basics',
        options: ['Position and Linear Momentum', 'Energy and Temperature', 'Mass and Velocity', 'Electric charge and magnetic field'],
        correct_index: 0,
        explanation: 'Delta x * Delta p >= h-bar / 2 establishes that position and linear momentum are canonically conjugate observables.',
        difficulty: 'easy'
      }
    ]
  },
  {
    name: 'Engineering Chemistry',
    slug: 'eng-chemistry',
    field: 'Engineering (Core)',
    description: 'Electrochemistry, polymers, water technology, corrosion engineering, and fuels.',
    topics: [
      { name: 'Electrochemistry & Batteries', description: 'Galvanic cells, Nernst equation, lithium-ion' },
      { name: 'Corrosion & Protection', description: 'Galvanic corrosion, sacrificial anode, coatings' },
      { name: 'Water Treatment', description: 'Hardness, reverse osmosis, ion exchange' },
      { name: 'Polymers & Composites', description: 'Thermoplastics, thermosets, polymerization' },
      { name: 'Spectroscopy & Instrumental', description: 'UV-Vis, IR spectroscopy, chromatography' }
    ],
    questions: [
      {
        prompt: 'In cathodic protection via sacrificial anode, what metal is commonly connected to steel underground pipelines to prevent rusting?',
        topic: 'Corrosion & Protection',
        options: ['Copper', 'Gold', 'Zinc or Magnesium', 'Lead'],
        correct_index: 2,
        explanation: 'Zinc and magnesium have more negative reduction potentials than iron/steel, oxidizing preferentially as sacrificial anodes.',
        difficulty: 'medium'
      },
      {
        prompt: 'What unit operation removes dissolved salts from seawater using a semipermeable membrane under high pressure?',
        topic: 'Water Treatment',
        options: ['Sedimentation', 'Reverse Osmosis', 'Aeration', 'Chlorination'],
        correct_index: 1,
        explanation: 'Reverse osmosis applies mechanical pressure higher than the natural osmotic pressure to force pure water through a semipermeable membrane.',
        difficulty: 'easy'
      }
    ]
  },
  {
    name: 'Basic Electrical',
    slug: 'basic-electrical',
    field: 'Engineering (Core)',
    description: 'DC/AC circuits, Kirchhoff’s laws, network theorems, transformers, and 3-phase systems.',
    topics: [
      { name: 'DC Circuit Analysis', description: 'KCL, KVL, nodal and mesh analysis' },
      { name: 'Network Theorems', description: 'Thevenin, Norton, Superposition, Maximum Power' },
      { name: 'AC Fundamentals', description: 'Phasors, impedance, power factor, resonance' },
      { name: 'Transformers', description: 'Core losses, winding ratios, efficiency' },
      { name: 'Electrical Machines', description: 'DC motors, 3-phase induction motors' }
    ],
    questions: [
      {
        prompt: 'Under Thevenin’s Theorem, any linear two-terminal DC network can be replaced by which equivalent circuit?',
        topic: 'Network Theorems',
        options: ['A single current source in parallel with a resistor', 'A single voltage source in series with a resistor', 'Two capacitors in parallel', 'An ideal transformer'],
        correct_index: 1,
        explanation: 'Thevenin’s equivalent consists of an open-circuit voltage source (Vth) in series with an equivalent resistance (Rth).',
        difficulty: 'easy'
      },
      {
        prompt: 'What happens to the power factor of an electrical load when capacitive correction is added to an inductive motor circuit?',
        topic: 'AC Fundamentals',
        options: ['Power factor moves closer to unity (1.0)', 'Power factor drops to zero', 'Power factor becomes negative', 'Current increases exponentially'],
        correct_index: 0,
        explanation: 'Capacitors supply leading reactive power (VARs) that cancel lagging inductive reactive power, bringing power factor toward unity.',
        difficulty: 'medium'
      }
    ]
  },
  {
    name: 'Engineering Mechanics',
    slug: 'eng-mechanics',
    field: 'Engineering (Core)',
    description: 'Statics, force equilibrium, trusses, friction, centroids, and rigid body dynamics.',
    topics: [
      { name: 'Equilibrium & Free Body Diagrams', description: 'Resultant forces, moments, support reactions' },
      { name: 'Trusses & Frames', description: 'Method of joints, method of sections' },
      { name: 'Friction', description: 'Static and kinetic friction, belt friction, wedges' },
      { name: 'Centroids & Moment of Inertia', description: 'Centroid of areas, parallel axis theorem' },
      { name: 'Kinematics & Kinetics', description: 'Work-energy, impulse-momentum, Newton’s second law' }
    ],
    questions: [
      {
        prompt: 'In a truss analyzed using the Method of Joints, what assumption is made about the joints?',
        topic: 'Trusses & Frames',
        options: ['All joints are rigid and carry bending moments', 'All joints are frictionless pinned connections carrying only axial forces', 'Loads can be applied anywhere along the length of members', 'Members carry shear forces'],
        correct_index: 1,
        explanation: 'Ideal truss theory assumes frictionless pin joints, meaning members only experience pure axial tension or compression.',
        difficulty: 'easy'
      },
      {
        prompt: 'According to the Parallel Axis Theorem, how is the moment of inertia I about any parallel axis distance d away calculated?',
        topic: 'Centroids & Moment of Inertia',
        options: ['I = I_cm - m * d^2', 'I = I_cm + m * d^2', 'I = I_cm * d', 'I = I_cm / d^2'],
        correct_index: 1,
        explanation: 'The moment of inertia about an axis parallel to a centroidal axis is I_cm + m * d^2.',
        difficulty: 'medium'
      }
    ]
  },
  {
    name: 'Thermodynamics',
    slug: 'thermodynamics',
    field: 'Engineering (Core)',
    description: 'Laws of thermodynamics, closed & open systems, Carnot cycle, entropy, and vapor power cycles.',
    topics: [
      { name: 'First Law & Energy Conservation', description: 'Heat, work, internal energy, enthalpy' },
      { name: 'Second Law & Entropy', description: 'Clausius inequality, entropy generation, reversibility' },
      { name: 'Pure Substances & Steam Tables', description: 'Phase diagrams, quality, superheated vapor' },
      { name: 'Gas Power Cycles', description: 'Otto, Diesel, Dual, and Brayton cycles' },
      { name: 'Vapor Power Cycles', description: 'Rankine cycle, reheat, regeneration' }
    ],
    questions: [
      {
        prompt: 'What does the Second Law of Thermodynamics state regarding an isolated system?',
        topic: 'Second Law & Entropy',
        options: ['Total energy decreases over time', 'The total entropy of an isolated system always increases or remains constant for reversible processes', 'Temperature cannot drop below zero Celsius', 'Heat naturally flows from colder to hotter bodies'],
        correct_index: 1,
        explanation: 'The second law establishes the arrow of time: Delta S_isolated >= 0 for any natural process.',
        difficulty: 'easy'
      },
      {
        prompt: 'What represents the thermal efficiency of a reversible Carnot heat engine operating between temperatures T_H and T_L (in Kelvin)?',
        topic: 'Second Law & Entropy',
        options: ['1 - (T_L / T_H)', '1 - (T_H / T_L)', 'T_L / T_H', '(T_H - T_L) / T_L'],
        correct_index: 0,
        explanation: 'The maximum theoretical efficiency of any heat engine operating between two thermal reservoirs is eta = 1 - (T_L / T_H).',
        difficulty: 'medium'
      }
    ]
  },

  // --- MEDICAL ---
  {
    name: 'Biology',
    slug: 'biology',
    field: 'Medical',
    description: 'Cell biology, molecular genetics, cellular respiration, meiosis, and evolutionary mechanisms.',
    topics: [
      { name: 'Cell Structure & Organelles', description: 'Membranes, mitochondria, endoplasmic reticulum' },
      { name: 'Molecular Genetics & DNA', description: 'Replication, transcription, translation, mutations' },
      { name: 'Cellular Respiration & ATP', description: 'Glycolysis, Krebs cycle, electron transport chain' },
      { name: 'Cell Division & Heredity', description: 'Mitosis, meiosis, Mendelian genetics' },
      { name: 'Ecology & Evolution', description: 'Natural selection, population genetics, ecosystems' }
    ],
    questions: [
      {
        prompt: 'In eukaryotic cells, which organelle is the primary site of oxidative phosphorylation and aerobic ATP production?',
        topic: 'Cell Structure & Organelles',
        options: ['Golgi apparatus', 'Mitochondria', 'Lysosome', 'Ribosome'],
        correct_index: 1,
        explanation: 'Mitochondria generate the vast majority of cellular ATP via the electron transport chain on the inner mitochondrial membrane.',
        difficulty: 'easy'
      },
      {
        prompt: 'During transcription in eukaryotic protein synthesis, which enzyme synthesizes mRNA from the DNA template strand?',
        topic: 'Molecular Genetics & DNA',
        options: ['DNA Polymerase III', 'RNA Polymerase II', 'DNA Ligase', 'Peptidyl transferase'],
        correct_index: 1,
        explanation: 'RNA Polymerase II reads the template DNA strand in the 3’ to 5’ direction to synthesize pre-mRNA.',
        difficulty: 'medium'
      }
    ]
  },
  {
    name: 'Human Anatomy',
    slug: 'human-anatomy',
    field: 'Medical',
    description: 'Skeletal, muscular, cardiovascular, nervous, and visceral gross anatomy and spatial relationships.',
    topics: [
      { name: 'Skeletal System & Joints', description: 'Axial, appendicular skeleton, synovial joints' },
      { name: 'Muscular System', description: 'Origins, insertions, actions, muscle compartments' },
      { name: 'Cardiovascular Anatomy', description: 'Heart chambers, great vessels, coronary circulation' },
      { name: 'Nervous System & Brain', description: 'Cerebrum, cerebellum, brainstem, cranial nerves' },
      { name: 'Gastrointestinal & Abdominal', description: 'Peritoneum, liver, pancreas, intestines' }
    ],
    questions: [
      {
        prompt: 'Which heart valve prevents backflow of oxygenated blood from the left ventricle into the left atrium during ventricular systole?',
        topic: 'Cardiovascular Anatomy',
        options: ['Tricuspid valve', 'Mitral (Bicuspid) valve', 'Aortic semilunar valve', 'Pulmonary valve'],
        correct_index: 1,
        explanation: 'The mitral (bicuspid) valve is located between the left atrium and left ventricle.',
        difficulty: 'easy'
      },
      {
        prompt: 'Which cranial nerve provides parasympathetic innervation to thoracic and abdominal viscera including the heart and GI tract?',
        topic: 'Nervous System & Brain',
        options: ['Cranial Nerve X (Vagus Nerve)', 'Cranial Nerve VII (Facial Nerve)', 'Cranial Nerve V (Trigeminal)', 'Cranial Nerve XII (Hypoglossal)'],
        correct_index: 0,
        explanation: 'The Vagus nerve (CN X) carries extensive parasympathetic autonomic fibers to organs in the thorax and abdomen.',
        difficulty: 'medium'
      }
    ]
  },
  {
    name: 'Physiology',
    slug: 'physiology',
    field: 'Medical',
    description: 'Homeostatic mechanisms, action potentials, cardiac cycle, renal filtration, and endocrine signaling.',
    topics: [
      { name: 'Neurophysiology & Action Potentials', description: 'Resting membrane potential, Na+/K+ channels, synapses' },
      { name: 'Cardiovascular Physiology', description: 'Cardiac output, blood pressure regulation, Baroreceptors' },
      { name: 'Respiratory Physiology', description: 'Gas exchange, ventilation-perfusion, hemoglobin affinity' },
      { name: 'Renal Physiology', description: 'GFR, nephron transport, countercurrent multiplier' },
      { name: 'Endocrine System', description: 'Hormonal axes, feedback loops, insulin/glucagon' }
    ],
    questions: [
      {
        prompt: 'What primarily causes the rapid depolarization phase (upstroke) of a neuronal action potential?',
        topic: 'Neurophysiology & Action Potentials',
        options: ['Influx of sodium ions (Na+) through voltage-gated channels', 'Efflux of potassium ions (K+)', 'Activation of the Na+/K+ ATPase pump', 'Influx of chloride ions (Cl-)'],
        correct_index: 0,
        explanation: 'Once threshold is reached, voltage-gated Na+ channels rapidly open, allowing Na+ to rush down its electrochemical gradient into the cell.',
        difficulty: 'easy'
      },
      {
        prompt: 'In the nephron, where does the majority of filtered water, sodium, and 100% of filtered glucose get reabsorbed?',
        topic: 'Renal Physiology',
        options: ['Distal convoluted tubule', 'Proximal convoluted tubule', 'Collecting duct', 'Loop of Henle ascending limb'],
        correct_index: 1,
        explanation: 'The proximal convoluted tubule reabsorbs ~65% of water and electrolytes and virtually all glucose via SGLT transporters.',
        difficulty: 'medium'
      }
    ]
  },
  {
    name: 'Biochemistry',
    slug: 'biochemistry',
    field: 'Medical',
    description: 'Enzyme kinetics, metabolic pathways (glycolysis, gluconeogenesis), lipids, and nucleic acids.',
    topics: [
      { name: 'Enzyme Kinetics & Regulation', description: 'Michaelis-Menten, Vmax, Km, competitive inhibition' },
      { name: 'Carbohydrate Metabolism', description: 'Glycolysis, Krebs cycle, glycogenolysis' },
      { name: 'Lipid Metabolism', description: 'Beta-oxidation, fatty acid synthesis, cholesterol' },
      { name: 'Amino Acid Metabolism', description: 'Transamination, urea cycle, essential amino acids' },
      { name: 'Bioenergetics & ATP', description: 'Free energy, redox couples, cytochromes' }
    ],
    questions: [
      {
        prompt: 'In Michaelis-Menten enzyme kinetics, what does the constant Km represent?',
        topic: 'Enzyme Kinetics & Regulation',
        options: ['The maximum rate of the reaction (Vmax)', 'The substrate concentration at which the reaction velocity is half of Vmax', 'The turnover number (kcat)', 'The activation energy in Joules'],
        correct_index: 1,
        explanation: 'Km is the substrate concentration at which the reaction reaches 1/2 Vmax; a lower Km indicates higher substrate affinity.',
        difficulty: 'medium'
      },
      {
        prompt: 'What is the rate-limiting regulatory enzyme of glycolysis?',
        topic: 'Carbohydrate Metabolism',
        options: ['Hexokinase', 'Phosphofructokinase-1 (PFK-1)', 'Pyruvate kinase', 'Aldolase'],
        correct_index: 1,
        explanation: 'PFK-1 catalyzes the committed phosphorylation of Fructose-6-phosphate to Fructose-1,6-bisphosphate.',
        difficulty: 'medium'
      }
    ]
  },
  {
    name: 'Pathology',
    slug: 'pathology',
    field: 'Medical',
    description: 'Cellular adaptation, necrosis, acute & chronic inflammation, neoplasia, and hemodynamic disorders.',
    topics: [
      { name: 'Cell Injury & Necrosis', description: 'Apoptosis vs necrosis, ischemia, free radicals' },
      { name: 'Inflammation & Healing', description: 'Vascular changes, leukocytes, granulation tissue' },
      { name: 'Hemodynamic Disorders', description: 'Edema, thrombosis, embolism, shock' },
      { name: 'Neoplasia & Oncology', description: 'Benign vs malignant, hallmarks of cancer, staging' },
      { name: 'Infectious & Immune Pathology', description: 'Hypersensitivity reactions, autoimmune diseases' }
    ],
    questions: [
      {
        prompt: 'What pattern of tissue necrosis is characteristic of ischemic stroke and brain infarcts?',
        topic: 'Cell Injury & Necrosis',
        options: ['Coagulative necrosis', 'Liquefactive necrosis', 'Caseous necrosis', 'Fat necrosis'],
        correct_index: 1,
        explanation: 'In the brain, rich hydrolytic lysosomal enzymes rapidly digest dead tissue into a viscous liquid, characteristic of liquefactive necrosis.',
        difficulty: 'medium'
      },
      {
        prompt: 'Which triad of factors (Virchow’s Triad) contributes directly to pathological thrombosis?',
        topic: 'Hemodynamic Disorders',
        options: ['Hypothermia, acidosis, coagulopathy', 'Endothelial injury, stasis or turbulent blood flow, hypercoagulability', 'Hypertension, hypoglycemia, infection', 'Vasodilation, bradycardia, hypoxia'],
        correct_index: 1,
        explanation: 'Virchow’s triad describes endothelial damage, abnormal flow (stasis/turbulence), and hypercoagulability as the primary triggers of thrombosis.',
        difficulty: 'easy'
      }
    ]
  },
  {
    name: 'Pharmacology',
    slug: 'pharmacology',
    field: 'Medical',
    description: 'Pharmacokinetics (ADME), pharmacodynamics, autonomic pharmacology, antimicrobials, and cardiovascular drugs.',
    topics: [
      { name: 'Pharmacokinetics (ADME)', description: 'Absorption, bioavailability, volume of distribution, clearance' },
      { name: 'Pharmacodynamics & Receptors', description: 'Agonists, antagonists, ED50, therapeutic index' },
      { name: 'Autonomic Nervous System Drugs', description: 'Adrenergic agonists/blockers, cholinergic agents' },
      { name: 'Cardiovascular Pharmacology', description: 'ACE inhibitors, beta-blockers, statins, antiarrhythmics' },
      { name: 'Antimicrobials & Antibiotics', description: 'Penicillins, cephalosporins, resistance mechanisms' }
    ],
    questions: [
      {
        prompt: 'What pharmacokinetic parameter indicates the fraction of an administered drug dose that reaches systemic circulation in active form?',
        topic: 'Pharmacokinetics (ADME)',
        options: ['Volume of distribution (Vd)', 'Bioavailability (F)', 'Clearance (Cl)', 'Half-life (t1/2)'],
        correct_index: 1,
        explanation: 'Bioavailability (F) is the fraction of unchanged drug that reaches the systemic circulation (100% for IV administration).',
        difficulty: 'easy'
      },
      {
        prompt: 'What is the primary mechanism of action of beta-lactam antibiotics like penicillin?',
        topic: 'Antimicrobials & Antibiotics',
        options: ['Inhibition of 50S bacterial ribosomal subunit', 'Inhibition of bacterial cell wall peptidoglycan synthesis via transpeptidase binding', 'Disruption of DNA gyrase', 'Inhibition of folic acid synthesis'],
        correct_index: 1,
        explanation: 'Beta-lactams bind penicillin-binding proteins (transpeptidases), blocking cross-linking of the peptidoglycan cell wall.',
        difficulty: 'medium'
      }
    ]
  }
];

let count = 0;
for (const sub of subjectsDefinition) {
  const filePath = path.join(outDir, `${sub.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(sub, null, 2), 'utf8');
  count++;
}

console.log(`[GEN] Generated ${count} subject JSON files in ${outDir}`);
