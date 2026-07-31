import { applyZebkitConfig } from "./zebkit.runtime.js";
import { defineZbkButton } from "zebkit/components/button";
import { defineZbkCard } from "zebkit/components/card";
import { defineZbkLink } from "zebkit/components/link";
import { defineZbkToggle } from "zebkit/components/toggle";

applyZebkitConfig();
defineZbkButton();
defineZbkCard();
defineZbkLink();
defineZbkToggle();
