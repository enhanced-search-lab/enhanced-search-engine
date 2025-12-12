import sys
from pathlib import Path
from typing import List, Dict

import numpy as np

# --- PYTHON PATH FIX (so we can import app.* when running from scripts/) ---
THIS_FILE = Path(__file__).resolve()
PROJECT_ROOT = None

for parent in THIS_FILE.parents:
    # Look for the "app" folder (backend code root)
    if (parent / "app").is_dir():
        PROJECT_ROOT = parent
        break

if PROJECT_ROOT is None:
    raise RuntimeError("Could not find 'app' folder for imports.")

sys.path.insert(0, str(PROJECT_ROOT))
# ---------------------------------------------------------------------------

from app.embeddings import build_final_embedding_for_work


# ================== 1) LABELED PAPERS ==================
# Each entry represents one paper that is labeled.
# Fields:
#   - id:    any short identifier (e.g. "mc_1", "wsn_3", etc.)
#   - group: label / scenario name (papers in the same scenario share the same group)
#   - title: paper title
#   - abstract: paper abstract
#


LABELED_PAPERS = [
    {
        "id": "thz_ch_1",
        "group": "Terrahertz, channel modeling, path-loss, energy harvesting",
        "title": "Channel Modeling and Capacity Analysis for Electromagnetic Wireless Nanonetworks in the Terahertz Band",
        "abstract": "Nanotechnology is enabling the development of devices in a scale ranging from one to a few hundred nanometers. Coordination and information sharing among these nano-devices will lead towards the development of future nanonetworks, rising new applications of nanotechnology in the medical, environmental and military fields. Despite the major progress in nano-device design and fabrication, it is still not clear how these atomically precise machines will communicate. The latest advancements in graphene- based electronics have opened the door to electromagnetic communication among nano-devices in the terahertz band (0.1-10 THz). This frequency band can potentially provide very large bandwidths, ranging from the entire band to several gigahertz- wide windows, depending on the transmission distance and the molecular composition of the channel. In this paper, the capacity of the terahertz channel is numerically evaluated by using a new terahertz propagation model, for different channel molecular compositions, and under different power allocation schemes. A novel communication technique based on the transmission of ultra-short pulses, less than one picosecond long, is motivated and quantitatively compared to the capacity- optimal power allocation scheme. The results show that for the very short range, up to a few tens of millimeters, the transmission of short pulses offer a realistic and still efficient way to exploit the terahertz channel."
    },
    {
        "id": "mc_ch_1",
        "group": "molecular communication, diffusion, observing receiver, channel modeling",
        "title": "A physical end-to-end model for molecular communication in nanonetworks",
        "abstract": "Molecular communication is a promising paradigm for nanoscale networks. The end-to-end (including the channel) models developed for classical wireless communication networks need to undergo a profound revision so that they can be applied for nanonetworks. Consequently, there is a need to develop new end-to-end (including the channel) models which can give new insights into the design of these nanoscale networks. The objective of this paper is to introduce a new physical end-to-end (including the channel) model for molecular communication. The new model is investigated by means of three modules, i.e., the transmitter, the signal propagation and the receiver. Each module is related to a specific process involving particle exchanges, namely, particle emission, particle diffusion and particle reception. The particle emission process involves the increase or decrease of the particle concentration rate in the environment according to a modulating input signal. The particle diffusion provides the propagation of particles from the transmitter to the receiver by means of the physics laws underlying particle diffusion in the space. The particle reception process is identified by the sensing of the particle concentration value at the receiver location. Numerical results are provided for three modules, as well as for the overall end-to-end model, in terms of normalized gain and delay as functions of the input frequency and of the transmission range."
    },
    {
        "id": "thz_mod_1",
        "group": "Terrahertz, modulation, channel modeling, energy harvesting",
        "title": "Femtosecond-Long Pulse-Based Modulation for Terahertz Band Communication in Nanonetworks",
        "abstract": "Nanonetworks consist of nano-sized communicating devices which are able to perform simple tasks at the nanoscale. Nanonetworks are the enabling technology of long-awaited applications such as advanced health monitoring systems or high-performance distributed nano-computing architectures. The peculiarities of novel plasmonic nano-transceivers and nano-antennas, which operate in the Terahertz Band (0.1-10 THz), require the development of tailored communication schemes for nanonetworks. In this paper, a modulation and channel access scheme for nanonetworks in the Terahertz Band is developed. The proposed technique is based on the transmission of one-hundred-femtosecond-long pulses by following an asymmetric On-Off Keying modulation Spread in Time (TS-OOK). The performance of TS-OOK is evaluated in terms of the achievable information rate in the single-user and the multi-user cases. An accurate Terahertz Band channel model, validated by COMSOL simulation, is used, and novel stochastic models for the molecular absorption noise in the Terahertz Band and for the multi-user interference in TS-OOK are developed. The results show that the proposed modulation can support a very large number of nano-devices simultaneously transmitting at multiple Gigabits-per-second and up to Terabits-per-second, depending on the modulation parameters and the network conditions."
    },
    {
        "id": "thz_ch_2",
        "group": "Terrahertz, channel modeling, scattering, path-loss",
        "title": "Frequency and Time Domain Channel Models for Nanonetworks in Terahertz Band",
        "abstract": "Time and frequency domain channel models are proposed for nanonetworks utilizing the terahertz band (0.1-10 THz) for wireless communication. Nanonetworks are formed by tiny nanodevices which consist of nanoscale (molecular scale) components. Channel models capturing the unique peculiarities of the THz band are needed for designing proper physical layer techniques and for accurate performance analysis. Existing channel models have included the free space path loss and the molecular absorption loss, which is significant in the THz band. This paper theoretically analyzes scattering including multiple scattering referring to a sequence of scattering events from small particles, such as aerosols. Both the frequency and the impulse responses are derived. It is shown that the small particle scattering can result into significant additional loss that needs to be taken into account with the loss depending on the density and size distribution of the particles. It is shown that multiple scattering leads to a long tail in the impulse response. As most of the physical layer proposals for nanonetworks are based on the on-off keying, the channel response to pulse waveforms is specifically considered."
    },
    {
        "id": "mc_ch_2",
        "group": "molecular communication, neurons, channel modeling",
        "title": "A Physical Channel Model for Nanoscale Neuro-Spike Communications",
        "abstract": "Nanoscale communications is an appealing domain in nanotechnology. Novel nanoscale communications techniques are currently being devised inspired by some naturally existing phenomena such as the molecular communications governing cellular signaling mechanisms. Among these, neuro-spike communications, which governs the communications between neurons, is a vastly unexplored area. The ultimate goal of this paper is to accurately investigate nanoscale neuro-spike communications characteristics through the development of a realistic physical channel model between two neurons. The neuro-spike communications channel is analyzed based on the probability of error and delay in spike detection at the output. The derived communication theoretical channel model may help designing novel artificial nanoscale communications methods for the realization of future practical nanonetworks, which are the interconnections of nanomachines."
    },
    {
        "id": "thz_ch_3",
        "group": "Terrahertz, channel modeling, signal propagation, channel capacity",
        "title": "Channel Capacity of Electromagnetic Nanonetworks in the Terahertz Band",
        "abstract": "Nanotechnology is enabling the development of devices in a scale ranging from one to a few hundred nanometers. Coordination and information sharing among these nano-devices will lead towards the development of future nanonetworks, rising new applications of nanotechnology in the medical, environmental and military fields. Despite the major progress in nano-device design and fabrication, it is still not clear how these atomically precise machines will communicate. The latest advancements in graphene- based electronics have opened the door to electromagnetic communication among nano-devices in the terahertz band (0.1-10 THz). This frequency band can potentially provide very large bandwidths, ranging from the entire band to several gigahertz- wide windows, depending on the transmission distance and the molecular composition of the channel. In this paper, the capacity of the terahertz channel is numerically evaluated by using a new terahertz propagation model, for different channel molecular compositions, and under different power allocation schemes. A novel communication technique based on the transmission of ultra-short pulses, less than one picosecond long, is motivated and quantitatively compared to the capacity- optimal power allocation scheme. The results show that for the very short range, up to a few tens of millimeters, the transmission of short pulses offer a realistic and still efficient way to exploit the terahertz channel."
    },
    {
        "id": "mc_mod_1",
        "group": "molecular communication, channel modeling, modulation",
        "title": "Diffusion-based channel characterization in molecular nanonetworks",
        "abstract": "Nanotechnology is enabling the development of devices in a scale ranging from one to a few hundred nanometers, known as nanomachines. How these nanomachines will communicate is still an open debate. Molecular communication is a promising paradigm that has been proposed to implement nanonetworks, i.e., the interconnection of nanomachines. Recent studies have attempted to model the physical channel of molecular communication, mainly from a communication or information-theoretical point of view. In this work, we focus on the diffusion-based molecular communication, whose physical channel is governed by Fick's laws of diffusion. We characterize the molecular channel following two complementary approaches: first, we obtain the channel impulse response, transfer function and group delay; second, we propose a pulse-based modulation scheme and we obtain analytical expressions for the most relevant performance evaluation metrics, which we also validate by simulation. Finally, we compare the scalability of these metrics with their equivalents in a wireless electromagnetic channel. We consider that these results provide interesting insights which may serve designers as a guide to implement future molecular nanonetworks."
    },
    {
        "id": "mc_mod_2",
        "group": "molecular communication, diffusion, modulation, inter-symbol-interference (ISI)",
        "title": "Robust Modulation Technique for Diffusion-based Molecular Communication in Nanonetworks",
        "abstract": "Diffusion-based molecular communication over nanonetworks is an emerging communication paradigm that enables nanomachines to communicate by using molecules as the information carrier. For such a communication paradigm, Concentration Shift Keying (CSK) has been considered as one of the most promising techniques for modulating information symbols, owing to its inherent simplicity and practicality. CSK modulated subsequent information symbols, however, may interfere with each other due to the random amount of time that molecules of each modulated symbols take to reach the receiver nanomachine. To alleviate Inter Symbol Interference (ISI) problem associated with CSK, we propose a new modulation technique called Zebra-CSK. The proposed Zebra-CSK adds inhibitor molecules in CSK-modulated molecular signal to selectively suppress ISI causing molecules. Numerical results from our newly developed probabilistic analytical model show that Zebra-CSK not only enhances capacity of the molecular channel but also reduces symbol error probability observed at the receiver nanomachine."
    },
    {
        "id": "mc_mod_3",
        "group": "molecular communication, modulation, baseband",
        "title": "Evaluation of digital baseband modulation schemes for molecular communication in nanonetworks",
        "abstract": "Molecular communications and nanonetworks become a popular and promising research direction recently. It uses molecules as the carrier to transmit information between nanomachines. Since the molecular communication is a novel communication paradigm, the communication principles and theories of it need to be re-considered and re-evaluated. In this paper, we describe four digital baseband modulation schemes for molecular communication systems, which modulate digital signals into the concentration of molecules. These modulation methods, including unipolar, polar, bipolar and Manchester methods, are investigated. The influences of the parameters such as symbol rate, distance, diffusion coefficient, are evaluated. The numerical results reveal that Manchester modulation scheme outperforms others in terms of bit error rate."
    },
    {
        "id": "thz_mod_2",
        "group": "Terrahertz, modulation, channel modeling",
        "title": "Femtosecond-Long Pulse-Based Modulation for Terahertz Band Communication in Nanonetworks",
        "abstract": "Nanonetworks consist of nano-sized communicating devices which are able to perform simple tasks at the nanoscale. Nanonetworks are the enabling technology of long-awaited applications such as advanced health monitoring systems or high-performance distributed nano-computing architectures. The peculiarities of novel plasmonic nano-transceivers and nano-antennas, which operate in the Terahertz Band (0.1-10 THz), require the development of tailored communication schemes for nanonetworks. In this paper, a modulation and channel access scheme for nanonetworks in the Terahertz Band is developed. The proposed technique is based on the transmission of one-hundred-femtosecond-long pulses by following an asymmetric On-Off Keying modulation Spread in Time (TS-OOK). The performance of TS-OOK is evaluated in terms of the achievable information rate in the single-user and the multi-user cases. An accurate Terahertz Band channel model, validated by COMSOL simulation, is used, and novel stochastic models for the molecular absorption noise in the Terahertz Band and for the multi-user interference in TS-OOK are developed. The results show that the proposed modulation can support a very large number of nano-devices simultaneously transmitting at multiple Gigabits-per-second and up to Terabits-per-second, depending on the modulation parameters and the network conditions."
    },
    {
        "id": "mc_mod_4",
        "group": "molecular communication, modulation, signal detection",
        "title": "Detection Techniques for Diffusion-based Molecular Communication",
        "abstract": "Nanonetworks, the interconnection of nanosystems, are envisaged to greatly expand the applications of nanotechnology in the biomedical, environmental and industrial fields. However, it is still not clear how these nanosystems will communicate among them. This work considers a scenario of Diffusion-based Molecular Communication (DMC), a promising paradigm that has been recently proposed to implement nanonetworks. In a DMC network, transmitters encode information by the emission of molecules which diffuse throughout the medium, eventually reaching the receiver locations. In this scenario, a pulse-based modulation scheme is proposed and two techniques for the detection of the molecular pulses, namely, amplitude detection and energy detection, are compared. In order to evaluate the performance of DMC using both detection schemes, the most important communication metrics in each case are identified. Their analytical expressions are obtained and validated by simulation. Finally, the scalability of the obtained performance evaluation metrics in both detection techniques is compared in order to determine their suitability to particular DMC scenarios. Energy detection is found to be more suitable when the transmission distance constitutes a bottleneck in the performance of the network, whereas amplitude detection will allow achieving a higher transmission rate in the cases where the transmission distance is not a limitation. These results provide interesting insights which may serve designers as a guide to implement future DMC networks."
    },
    {
        "id": "mc_mod_5",
        "group": "Molecular communication, modulation, signal detection",
        "title": "Diffusion-Based Nanonetworking: A New Modulation Technique and Performance Analysis",
        "abstract": "Abstract—In this letter, we propose a new molecular modula-tion scheme for nanonetworks. To evaluate the scheme we intro-duce a more realistic system model for molecule dissemination and propagation processes based on the Poisson distribution. We derive the probability of error of our proposed scheme as well as the previously introduced schemes, including concentration and molecular shift keying modulations by taking into account the error propagation effect of previously decoded symbols. Since in our scheme the decoding of the current symbol does not depend on the previously transmitted and decoded symbols, we do not encounter error propagation; and so as our numerical results indicate, the proposed scheme outperforms the previously introduced schemes. We then introduce a general molecular communication system and use information theoretic tools to derive fundamental limits on its probability of error."
    },
    {
        "id": "mc_mod_6",
        "group": "Molecular communication, modulation, error rate, achievable rate",
        "title": "D-MoSK Modulation in Molecular Communications",
        "abstract": "Molecular communication in nanonetworks is an emerging communication paradigm that uses molecules as information carriers. In molecule shift keying (MoSK), where different types of molecules are used for encoding, transmitter and receiver complexities increase as the modulation order increases. We propose a modulation technique called depleted MoSK (D-MoSK) in which, molecules are released if the information bit is 1 and no molecule is released for 0. The proposed scheme enjoys reduced number of the types of molecules for encoding. Numerical results show that the achievable rate is considerably higher and symbol error rate (SER) performance is better in the proposed technique."
    },
    {
        "id": "mc_unlabeled_1",
        "group": "UNLABELED",
        "title": " Diffusion-based channel characterization in molecular nanonetworks",
        "abstract": "Nanotechnology is enabling the development of devices in a scale ranging from one to a few hundred nanometers, known as nanomachines. How these nanomachines will communicate is still an open debate. Molecular communication is a promising paradigm that has been proposed to implement nanonetworks, i.e., the interconnection of nanomachines. Recent studies have attempted to model the physical channel of molecular communication, mainly from a communication or information-theoretical point of view. In this work, we focus on the diffusion-based molecular communication, whose physical channel is governed by Fick's laws of diffusion. We characterize the molecular channel following two complementary approaches: first, we obtain the channel impulse response, transfer function and group delay; second, we propose a pulse-based modulation scheme and we obtain analytical expressions for the most relevant performance evaluation metrics, which we also validate by simulation. Finally, we compare the scalability of these metrics with their equivalents in a wireless electromagnetic channel. We consider that these results provide interesting insights which may serve designers as a guide to implement future molecular nanonetworks."
    },
    {
        "id": "mc_sync_1",
        "group": "Molecular communication, synchronization",
        "title": "Bio-Inspired Synchronization for Nanocommunication Networks",
        "abstract": "Nanonetworks are networks of devices inherently working and communicating at a scale ranging between one and hundreds of nanometers. The motivation behind these nanonetworks is to enhance the complexity and range of operation of the system, as the nanomachines that will be part of these networks have significant limitations in terms of size and power consumption. Neither classical communication schemes nor protocols used in conventional networks are valid in this new scenario. For instance, synchronization between nodes is a feature commonly required to build a network architecture. In this paper, we propose Quorum Sensing as a valid tool to achieve synchronization in a cluster of nodes of a nanonetwork by means of molecular communication, and in a distributed manner. Quorum Sensing is a mechanism by which bacteria coordinate their behavior, based on the emission and reception of molecules called autoinducers. The authors present the communication aspects of this natural phenomenon, as well as some simulation results that show the performance of Quorum Sensing-enabled entities. As a conclusion, some possible applications are outlined."
    },
    {
        "id": "mc_sync_2",
        "group": "Molecular communication, synchronization, estimating clock skew",
        "title": "Diffusion-Based Clock Synchronization for Molecular Communication Under Inverse Gaussian Distribution",
        "abstract": "Nanonetworks are expected to expand the capabilities of individual nanomachines by allowing them to cooperate and share information by molecular communication. The information molecules are released by the transmitter nanomachine and diffuse across the aqueous channel as a Brownian motion holding the feature of a strong random movement with a large propagation delay. In order to ensure an effective real-time cooperation, it is necessary to keep the clock synchronized among the nanomachines in the nanonetwork. This paper proposes a model on a two-way message exchange mechanism with the molecular propagation delay based on the inverse Gaussian distribution. The clock offset and clock skew are estimated by the maximum likelihood estimation (MLE). Simulation results by MATLAB show that the mean square errors (MSE) of the estimated clock offsets and clock skews can be reduced and converge with a number of rounds of message exchanges. The comparison of the proposed scheme with a clock synchronization method based on symmetrical propagation delay demonstrates that our proposed scheme can achieve a better performance in terms of accuracy."
    },
    {
        "id": "mc_sync_3",
        "group": "molecular communication, synchronization",
        "title": "Networking challenges and principles in diffusion-based molecular communication",
        "abstract": "Nanotechnology has allowed building nanomachines capable of performing simple tasks, such as sensing, data storage, and actuation. Nanonetworks, networks of nanomachines, will allow cooperation and information sharing among them, thereby greatly expanding the applications of nanotechnology in the biomedical, environmental,and industrial fields. One of the most promising paradigms to implement nanonetworks is diffusion-based molecular communication (DMC). In DMC, nanomachines transmit information by the emission of molecules that diffuse throughout the medium until they reach their destination. Most of the existing literature in DMC has focused on the analysis of its physical channel. In this work, the key differences of the physical channel of DMC with respect to the wireless electromagnetic channel are reviewed with the purpose of learning how they impact the design of networks using DMC. In particular, we find that the uniqueness of the physical channel of DMC will require revisiting most of the protocols and techniques developed for traditional wireless networks in order to adapt them to DMC networks. Furthermore, guidelines for the design of a novel network architecture for DMC networks, including fundamental aspects such as coding, medium access control, addressing, routing and synchronization, are provided."
    },
    {
        "id": "mc_sync_4",
        "group": "Molecular Communication, synchronization",
        "title": "Quorum Sensing-enabled amplification for molecular nanonetworks",
        "abstract": "Nanotechnology is enabling the development of devices in a scale ranging from a few to hundreds of nanometers. The nanonetworks that result from interconnecting these devices greatly expand the possible applications, by increasing the complexity and range of operation of the system. Molecular communication is regarded as a promising way to realize this interconnection in a bio-compatible and energy efficient manner, enabling its use in biomedical applications. However, the transmission range of molecular signals is strongly limited due to the large and inherent losses of the diffusion process. In this paper, we propose the employment of Quorum Sensing so as to achieve cooperative amplification of a given signal. By means of Quorum Sensing, we aim to synchronize the course of action of a certain number of emitters, which will transmit the same signal. Under the assumption of a linear channel, such signal will be amplified and thus the transmission range will be consequently extended. Finally, we validate our proposal through simulation."
    },
    {
        "id": "mc_sync_5",
        "group": "Molecular communication, synchronization",
        "title": "Evaluation of Molecular Oscillation for Nanonetworks Based on Quorum Sensing",
        "abstract": "Bio-inspired molecular communication is a novel kind of communication technology, which uses biochemical molecules as the information carrier. Single nanomachine has limited ability to accomplish targeted goals, so a nanonetwork, which is composed of interconnected nanomachines, is expected. To perform cooperative operations in a nanonetwork, the synchronization among nanomachines is essential. With this purpose, we propose a simple quorum-sensing-based oscillation model. By using the proposed methodology, the instantaneous emission of molecules in quorum sensing is modeled and evaluated. The self-excited oscillation can occur when the molecular concentration decreases below a certain threshold. Analysis and simulations are performed to determine how the biological attributes of the nanomachines, the threshold, the distance between nanomachines and the dimension of the simulation space impact the periods and the phases of the oscillation."
    },
    {
        "id": "mc_testbed_1",
        "group": "molecular communication, testbed, channel model",
        "title": "Tabletop Molecular Communication: Text Messages through Chemical Signals",
        "abstract": "In this work, we describe the first modular, and programmable platform capable of transmitting a text message using chemical signalling - a method also known as molecular communication. This form of communication is attractive for applications where conventional wireless systems perform poorly, from nanotechnology to urban health monitoring. Using examples, we demonstrate the use of our platform as a testbed for molecular communication, and illustrate the features of these communication systems using experiments. By providing a simple and inexpensive means of performing experiments, our system fills an important gap in the molecular communication literature, where much current work is done in simulation with simplified system models. A key finding in this paper is that these systems are often nonlinear in practice, whereas current simulations and analysis often assume that the system is linear. However, as we show in this work, despite the nonlinearity, reliable communication is still possible. Furthermore, this work motivates future studies on more realistic modelling, analysis, and design of theoretical models and algorithms for these systems."
    },
    {
        "id": "wsn_eb_1",
        "group": "WSN, energy budget, latency, testbed, energy harvesting",
        "title": "Power management for wireless sensor networks based on energy budgets",
        "abstract": "This paper proposes and assesses analytical tools for large-scale monitoring applications with wireless sensor networks powered by energy-harvesting supplies. We introduce the concept of an energy budget, the amount of energy available to a sensor node for a given period of time. The presented tools can be utilized to realize distributed algorithms that determine a schedule to perform the monitoring task and the inherent communication. Scheduling is based on the energy budgets of the nodes or on latency requirements. In this context, we derive theoretical results for the energy consumption of the individual nodes plus the latency of event-reporting. These results are verified by simulations and a real testbed implementation."
    },
    {
        "id": "wsn_dc_1",
        "group": "WSN, data collection, energy budget, cluster",
        "title": "Adaptive Approximate Data Collection for Wireless Sensor Networks",
        "abstract": "Data collection is a fundamental task in wireless sensor networks. In many applications of wireless sensor networks, approximate data collection is a wise choice due to the constraints in communication bandwidth and energy budget. In this paper, we focus on efficient approximate data collection with prespecified error bounds in wireless sensor networks. The key idea of our data collection approach ADC (Approximate Data Collection) is to divide a sensor network into clusters, discover local data correlations on each cluster head, and perform global approximate data collection on the sink node according to model parameters uploaded by cluster heads. Specifically, we propose a local estimation model to approximate the readings of sensor nodes in subsets, and prove rated error-bounds of data collection using this model. In the process of model-based data collection, we formulate the problem of selecting the minimum subset of sensor nodes into a minimum dominating set problem which is known to be NP-hard, and propose a greedy heuristic algorithm to find an approximate solution. We further propose a monitoring algorithm to adaptively adjust the composition of node subsets according to changes of sensor readings. Our trace-driven simulations demonstrate that ADC remarkably reduces communication cost of data collection with guaranteed error bounds."
    },
    {
        "id": "wsn_eb_2",
        "group": "WSN, energy budget, duty-cycle, latency, energy harvesting",
        "title": "Benefits of Wake-Up Radio in Energy-Efficient Multimodal Surveillance Wireless Sensor Network",
        "abstract": "Scarce energy budget of battery-powered wireless sensor nodes calls for cautious power management not to compromise performance of the system. To reduce both energy consumption and delay in energy-hungry wireless sensor networks for latency-restricted surveillance scenarios, this paper proposes a multimodal two-tier architecture with wake-up radio receivers. In video surveillance applications, using information from distributed low-power pyroelectric infrared (PIR) sensors which detect human presence limits the activity of cameras and reduces their energy consumption. PIR sensors transmit the information about the event to camera nodes using wake-up radio receivers. We show the benefits of wake-up receivers over dutycycling in terms of overcoming energy consumption vs. latency trade-off (proved with two orders of magnitude lower latency – only 9 ms). At the same time, the power consumption of the camera node including a wake-up receiver is comparable with the one having only duty-cycled main transceiver with 1% duty cycle (about 32 mW for 25 activations per hour)."
    },
    {
        "id": "wsn_dc_2",
        "group": "WSN, Data collection",
        "title": "Spatiotemporal relations between water budget components and soil water content in a forested tributary catchment",
        "abstract": "We examined 3 years of measured daily values of all major water budget components (precipitation P, potential evapotranspiration PET, actual evapotranspiration ET, and runoff R) and volumetric soil water content θ of a small, forested catchment located in the west of Germany. The spatial distribution of θ was determined from a wireless sensor network of 109 points with 3 measurement depths each; ET was calculated from eddy‐covariance tower measurements. The water budget was dominantly energy limited, with ET amounting to approximately 90% of PET, and a runoff ratio R/P of 56%. P, ET, and R closed the long‐term water budget with a residual of 2% of precipitation. On the daily time scale, the residual of the water budget was larger than on the annual time scale, and explained to a moderate extent by θ (R2 = 0.40). Wavelet analysis revealed subweekly time scales, presumably dominated by unaccounted fast‐turnover storage terms such as interception, as a major source of uncertainty in water balance closure. At weekly resolution, soil water content explained more than half (R2 = 0.62) of the residual. By means of combined empirical orthogonal function and cluster analysis, two slightly different spatial patterns of θ could be identified that were associated with mean θ values below and above 0.35 cm3/cm3, respectively. The timing of these patterns as well as the varying coherence between PET, ET, and soil water content responded to changes in water availability, including a moderate response to the European drought in spring 2011."
    },
    {
        "id": "wsn_dc_3",
        "group": "WSN, energy budget, data collection",
        "title": "Data Reduction in Wireless Sensor Networks: A Hierarchical LMS Prediction Approach",
        "abstract": "In wireless sensor networks (WSNs), due to the restriction of scarce energy, it remains an open challenge how to schedule the data communications between the sensor nodes and the sink to reduce power usage with the aim of maximizing the network lifetime. To face this challenge, this paper proposes a workable data communication scheme utilizing the hierarchical Least-Mean-Square (HLMS) adaptive filter. The HLMS predicting techniques are explored that predict the measured values both at the source and at the sink, sensor nodes are subsequently required only to send those readings that deviate from the prediction by an error budget. Such data reduction strategy achieves significant power savings by reducing the amount of data sent by each node. We discuss the working mechanism of HLMS in the purpose of data reduction in WSNs, analyze the mean-squared error in the two level HLMS, and design the interactive HLMS prediction algorithm implemented at sink and sensor node and the transmission protocol between them. To elaborate on our theoretical proposal, the HLMS algorithms and protocols are then evaluated by simulation. Simulation results show that our proposed scheme achieves major improvement in convergence speed compared with previous approaches, and achieves up to 95% communication reduction for the temperature measurements acquired at Intel Berkeley lab while maintaining a minimal accuracy of 0.3 °C."
    },
    {
        "id": "wsn_deploy_1",
        "group": "WSN, energy budget, deployment",
        "title": "Mobility-aware charger deployment for wireless rechargeable sensor networks",
        "abstract": "Wireless charging technology is considered as one of the promising solutions to solve the energy limitation problem for large-scale wireless sensor networks. Obviously, charger deployment is a critical issue since the number of chargers would be limited by the network construction budget, which makes the full-coverage deployment of chargers infeasible. In many of the applications targeted by large-scale wireless sensor networks, end-devices are usually equipped by the human and their movement follows some degree of regularity. Therefore in this paper, we utilize this property to deploy chargers with partial coverage, with an objective to maximize the survival rate of end-devices. We prove this problem is NP-hard, and propose an algorithm to tackle it. The simulation results show that our proposed algorithm can significantly increase the survival rate of end-devices. To our knowledge, this is one of very first works that consider charger deployment with partial coverage in wireless rechargeable sensor networks."
    },
    {
        "id": "wsn_eb_3",
        "group": "WSN, energy budget, duty-cycle",
        "title": "Energy aware adaptive sampling algorithm for energy harvesting wireless sensor networks",
        "abstract": "Wireless sensor nodes have a limited power budget, while they are often expected to be functional for a very long period of time once deployed in the field. Therefore, the minimization of energy consumption and energy harvesting technology are key tools for maximization of network lifetime and achieving self sustainability in Wireless Sensor Networks (WSN). This paper proposes an energy aware Adaptive Sampling Algorithm (ASA) for WSN with power hungry sensors and harvesting capabilities. An existing ASA developed for wireless sensor networks with power hungry sensors is optimized and enhanced to adapt the sampling frequency according to the available energy of the node. The proposed algorithm is evaluated using an in-field testbed with a sensor node which incorporates a wind harvester and a power hungry wind speed/direction sensor. Simulation and comparison between an existing ASA and the energy aware ASA in terms of energy durability are carried out using the measured wind energy and the wind speed over a period of a month. The simulation results have shown that using ASA in combination with energy aware function on the nodes can drastically increase the lifetime of a WSN node. Moreover, the energy aware ASA in conjunction with the node energy harvesting capability can lead towards a perpetual operation of WSN and significantly outperform state-of-the-art ASA."
    },
    {
        "id": "wsn_dc_4",
        "group": "WSN, data collection, energy budget",
        "title": " Stochastic Sensor Scheduling for Energy Constrained Estimation in Multi-Hop Wireless Sensor Networks",
        "abstract": "Wireless Sensor Networks (WSNs) enable a wealth of new applications where remote estimation is essential. Individual sensors simultaneously sense a dynamic process and transmit measured information over a shared channel to a central fusion center. The fusion center computes an estimate of the process state by means of a Kalman filter. In this paper we assume that the WSN admits a tree topology with fusion center at the root. At each time step only a subset of sensors can be selected to transmit observations to the fusion center due to a limited energy budget. We propose a stochastic sensor selection algorithm that randomly selects a subset of sensors according to certain probability distribution, which is opportunely designed to minimize the asymptotic expected estimation error covariance matrix. We show that the optimal stochastic sensor selection problem can be relaxed into a convex optimization problem and thus solved efficiently. We also provide a possible implementation of our algorithm which does not introduce any communication overhead. The paper ends with some numerical examples that show the effectiveness of the proposed approach."
    },
    {
        "id": "wsn_eb_4",
        "group": "WSN, energy budget, energy harvesting",
        "title": "An 86% Efficiency 12 µW Self-Sustaining PV Energy Harvesting System With Hysteresis Regulation and Time-Domain MPPT for IOT Smart Nodes",
        "abstract": "This paper presents a fully-integrated μW-level photovoltaic (PV) self-sustaining energy harvesting system proposed for smart nodes of Internet of Things (IOT) networks. A hysteresis regulation is designed to provide a constant 3.3 V output voltage for a host of applications, including powering sensors, signal processors, and wireless transmitters. Due to the stringent power budget in IOT scenarios, the power consumption of the harvesting system is optimized by multiple system and circuit level techniques. Firstly, the hill-climbing MPPT mechanism reuses and processes the information of the hysteresis controller in the time-domain and is free of power hungry analog circuits. Secondly, the typical power-performance tradeoff of the hysteresis controller is solved by a self-triggered one-shot mechanism. Thus, the output regulation achieves high-performance and yet low-power operations. Thirdly, to execute the impedance tuning of MPPT, the capacitor value modulation (CVM) scheme is proposed instead of the conventional frequency modulation scheme, avoiding quiescent power consumption. Utilizing a commercial PV cell of 2.5 cm2, the proposed system provides 0-21 μW output power to the IOT smart nodes. Measured results showed that the PV harvesting system achieved both ultra-low power operation capability at 12 μW and a peak self-sustaining efficiency of 86%."
    },
    {
        "id": "wsn_clock_1",
        "group": "estimating clock skew, WSN, energy budget",
        "title": "A 5.58nW 32.768kHz DLL-assisted XO for real-time clocks in wireless sensing applications",
        "abstract": "There is a growing interest in ultra-low-power wireless microsystems. Synchronization between different nodes in a wireless sensor network plays an important role in the overall node energy budget due to the high power demand of wireless communication. One synchronization approach is to employ a realtime clock (RTC) on each node, with nodes awakening periodically to communicate and re-synchronize. With recent work on ultra-low-power microsystems demonstrating average power consumption of several nW, there is a need for ultra-low-power timers that can synchronize communication events and serve as frequency references for radios."
    },
]




# ================== 2) EMBEDDING HELPER ======================================

def embed_paper(paper: Dict[str, str]) -> np.ndarray:
    """
    Build an embedding for a single paper using the same function
    you use in the main project (title + abstract).
    """
    v = build_final_embedding_for_work(
        title=paper["title"],
        abstract=paper["abstract"],
        topics_text=None,
        concepts_text=None,
    )
    if v is None:
        raise RuntimeError(f"Embedding could not be built for paper id={paper['id']}")
    return np.asarray(v, dtype="float32")


#===================LABELING INTO GROUPS======================================
def map_label_to_group(label: str) -> str:
    """
    Map the fine-grained PDF label (string) into a coarser group.
    This lets us consider 'similar labels' as belonging to the same scenario.
    """
    if label == "UNLABELED":
        return "UNLABELED"

    l = label.lower().strip()

    # Terahertz papers
    if "terrahertz" in l:
        if "modulation" in l:
            return "THZ_modulation"
        else:
            return "THZ_channel_modeling"

    # Wireless Sensor Network (WSN) papers
    if "wsn" in l:
        # clock / timing oriented WSN paper
        if "clock skew" in l:
            return "WSN_clock_energy"

        # data collection focus
        if "data collection" in l:
            return "WSN_data_collection"

        # energy-budget focus
        if "energy budget" in l:
            return "WSN_energy_budget"

        return "WSN_other"

    # Molecular communication papers
    if "molecular communication" in l:
        # synchronization-oriented
        if "synchronization" in l or "clock skew" in l:
            return "MC_synchronization"

        # testbed / experimental platform
        if "testbed" in l:
            return "MC_testbed"

        # modulation-focused
        if "modulation" in l:
            return "MC_modulation"

        # channel-modeling-focused
        if "channel modeling" in l or "channel model" in l:
            return "MC_channel_modeling"

        return "MC_other"

    # fallback for anything unexpected
    return "OTHER"


# ================== 3) EVALUATION LOGIC ======================================

def main() -> None:
    if len(LABELED_PAPERS) < 2:
        print("LABELED_PAPERS must contain at least 2 papers.")
        return

    print(f"Number of labeled papers: {len(LABELED_PAPERS)}")
    print("Computing embeddings...")

    vectors: List[np.ndarray] = []
    groups: List[str] = []   # coarse groups derived from labels
    ids: List[str] = []
    labels: List[str] = []   # original fine-grained label strings from PDF

    # 1) Compute embeddings for all labeled papers
    for p in LABELED_PAPERS:
        v = embed_paper(p)
        vectors.append(v)

        coarse_group = map_label_to_group(p["group"])
        groups.append(coarse_group)
        ids.append(p["id"])
        labels.append(p["group"])

    vectors_np = np.stack(vectors, axis=0)  # shape: (N, D)
    N = vectors_np.shape[0]

    # 2) L2-normalize -> cosine similarity becomes simple dot product
    norms = np.linalg.norm(vectors_np, axis=1, keepdims=True) + 1e-8
    vec_norm = vectors_np / norms

    # 3) Cosine similarity matrix: sim[i, j] = cosine(v_i, v_j)
    sim_matrix = vec_norm @ vec_norm.T  # shape: (N, N)

    TOP_K = 5  # how many nearest neighbors we look at for each paper
    same_label_ratios: List[float] = []

    print("\n=== Detailed results for each paper ===\n")

    for i in range(N):
        sims = sim_matrix[i].copy()
        sims[i] = -1.0  # exclude self-similarity

        nn_idx = np.argsort(-sims)[:TOP_K]

        this_group = groups[i]     # coarse group
        this_id = ids[i]
        this_label = labels[i]     # original label from PDF

        same_group_count = sum(1 for j in nn_idx if groups[j] == this_group)
        ratio = same_group_count / TOP_K
        same_label_ratios.append(ratio)

        print(f"Paper {this_id}")
        print(f"  Fine label: {this_label}")
        print(f"  Coarse group used for eval: {this_group}")
        print(f"  -> Same-group neighbors in top-{TOP_K}: {same_group_count}/{TOP_K}")
        print("  Neighbors (id, coarse_group, sim):")
        for j in nn_idx:
            print(f"    - {ids[j]:20s} | {groups[j]:20s} | sim={sims[j]:.3f}")
        print()


    avg_ratio = float(np.mean(same_label_ratios))
    print("=== Summary ===")
    print(f"Total number of papers: {N}")
    print(f"Average same-group ratio in top-{TOP_K}: {avg_ratio:.3f}")


if __name__ == "__main__":
    main()
