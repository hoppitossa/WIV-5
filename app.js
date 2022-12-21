import { Color, LineBasicMaterial, MeshBasicMaterial } from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';

import {
    IFCWALLSTANDARDCASE,
    IFCSLAB,
    IFCDOOR,
    IFCWINDOW,
    IFCFURNISHINGELEMENT,
    IFCMEMBER,
    IFCPLATE
} from 'web-ifc';

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({ container, backgroundColor: new Color(0xffffff) });

// Create grid and axes
viewer.grid.setGrid();
viewer.axes.setAxes();

loadIfc('./Dokument.ifc');

async function loadIfc(url) {
    //await viewer.IFC.setWasmPath("../../../");
    const model = await viewer.IFC.loadIfcUrl(url);
    model.removeFromParent();
     await viewer.shadowDropper.renderShadow(model.modelID);
    viewer.context.renderer.postProduction.active = true;
    await setupAllCategories();
    const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
    createTreeMenu(ifcProject);
    viewer.dimensions.active = true;
    viewer.dimensions.previewActive = true;
    
    //viewer.context.renderer.postProduction.active = true;

	await viewer.plans.computeAllPlanViews(model.modelID);
	const lineMaterial = new LineBasicMaterial({color: 'black'});
	const baseMaterial = new MeshBasicMaterial({
		polygonOffset: true,
		polygonOffsetFactor:1,
		polygonOffsetUnits:1
	});

	viewer.edges.create('example',model.modelID, lineMaterial, baseMaterial);
//use button
	const container = document.getElementById('button-container');
	const allPlans = viewer.plans.getAll(model.modelID);

	for(const plan of allPlans){
		const currentPlan = viewer.plans.planLists[model.modelID][plan];
		console.log(currentPlan);

		const button = document.createElement('button');
		container.appendChild(button);
		button.textContent = currentPlan.name;
		button.onclick = () => {
			viewer.plans.goTo(model.modelID, plan);
			viewer.edges.toggle('example-edges',true);
		} 
	}

	const button = document.createElement('button');
	container.appendChild(button);
	button.textContent = 'Exit floorplans'
	button.onclick = () => {
		viewer.plans.exitPlanView();
		viewer.edges.toggle('example', false);
		togglePostproduction(true);
	}
//use annotate
    window.ondblclick = () => {
        viewer.dimensions.create();
    }

    window.onkeydown = (event) => {
        if(event.code === 'Delete') {
            viewer.dimensions.delete();
        }
    }
}

//////////multithreading


////////////get visability////////

const scene = viewer.context.getScene();
// List of categories names
const categories = {
    IFCWALLSTANDARDCASE,
    IFCSLAB,
    IFCFURNISHINGELEMENT,
    IFCDOOR,
    IFCWINDOW,
    IFCPLATE,
    IFCMEMBER
};
// Gets the name of a category
function getName(category) {
    const names = Object.keys(categories);
    return names.find(name => categories[name] === category);
}
//viewer.IFC.loadIfcUrl('./Dokument.ifc');
// Gets the IDs of all the items of a specific category
async function getAll(category) {
    return viewer.IFC.loader.ifcManager.getAllItemsOfType(0, category, false);
}


// Creates a new subset containing all elements of a category
async function newSubsetOfType(category) {
    const ids = await getAll(category);
    return viewer.IFC.loader.ifcManager.createSubset({
        modelID: 0,
        scene,
        ids,
        removePrevious: true,
        customID: category.toString()
    })
}
// Stores the created subsets
const subsets = {};

async function setupAllCategories() {
	const allCategories = Object.values(categories);
	for (let i = 0; i < allCategories.length; i++) {
		const category = allCategories[i];
		await setupCategory(category);
	}
}

// Creates a new subset and configures the checkbox
async function setupCategory(category) {
	subsets[category] = await newSubsetOfType(category);
	setupCheckBox(category);
}

// Sets up the checkbox event to hide / show elements
function setupCheckBox(category) {
	const name = getName(category);
	const checkBox = document.getElementById(name);
	checkBox.addEventListener('change', (event) => {
		const checked = event.target.checked;
		const subset = subsets[category];
		if (checked) scene.add(subset);
		else subset.removeFromParent();
	});
}

// Tree view

const toggler = document.getElementsByClassName("caret");
for (let i = 0; i < toggler.length; i++) {
    toggler[i].onclick = () => {
        toggler[i].parentElement.querySelector(".nested").classList.toggle("active");
        toggler[i].classList.toggle("caret-down");
    }
}

// Spatial tree menu

function createTreeMenu(ifcProject) {
    const root = document.getElementById("tree-root");
    removeAllChildren(root);
    const ifcProjectNode = createNestedChild(root, ifcProject);
    ifcProject.children.forEach(child => {
        constructTreeMenuNode(ifcProjectNode, child);
    })
}

function nodeToString(node) {
    return `${node.type} - ${node.expressID}`
}

function constructTreeMenuNode(parent, node) {
    const children = node.children;
    if (children.length === 0) {
        createSimpleChild(parent, node);
        return;
    }
    const nodeElement = createNestedChild(parent, node);
    children.forEach(child => {
        constructTreeMenuNode(nodeElement, child);
    })
}

function createNestedChild(parent, node) {
    const content = nodeToString(node);
    const root = document.createElement('li');
    createTitle(root, content);
    const childrenContainer = document.createElement('ul');
    childrenContainer.classList.add("nested");
    root.appendChild(childrenContainer);
    parent.appendChild(root);
    return childrenContainer;
}

function createTitle(parent, content) {
    const title = document.createElement("span");
    title.classList.add("caret");
    title.onclick = () => {
        title.parentElement.querySelector(".nested").classList.toggle("active");
        title.classList.toggle("caret-down");
    }
    title.textContent = content;
    parent.appendChild(title);
}

function createSimpleChild(parent, node) {
    const content = nodeToString(node);
    const childNode = document.createElement('li');
    childNode.classList.add('leaf-node');
    childNode.textContent = content;
    parent.appendChild(childNode);

    childNode.onmouseenter = () => {
        viewer.IFC.selector.prepickIfcItemsByID(0, [node.expressID]);
    }

    childNode.onclick = async () => {
        viewer.IFC.selector.pickIfcItemsByID(0, [node.expressID]);
    }
}

function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

////////////get 2dplan////////

function togglePostproduction(active) {
	viewer.context.renderer.postProduction.active=active;
}



